package biz

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/data"
)

type AuthUsecase struct {
	twitterOAuth *auth.TwitterOAuth
	jwtManager   *auth.JWTManager
	userRepo     *data.UserRepo
	connRepo     *data.PlatformConnectionRepo
}

func NewAuthUsecase(
	twitterOAuth *auth.TwitterOAuth,
	jwtManager *auth.JWTManager,
	userRepo *data.UserRepo,
	connRepo *data.PlatformConnectionRepo,
) *AuthUsecase {
	return &AuthUsecase{
		twitterOAuth: twitterOAuth,
		jwtManager:   jwtManager,
		userRepo:     userRepo,
		connRepo:     connRepo,
	}
}

type OAuthURLResult struct {
	URL           string
	State         string
	CodeVerifier  string
}

// skipLoginPrompt 为 true 时授权 URL 不带 prompt=login（见 TwitterOAuth.GetAuthURL）。
func (uc *AuthUsecase) GetTwitterOAuthURL(skipLoginPrompt bool) (*OAuthURLResult, error) {
	state, err := uc.twitterOAuth.GenerateState()
	if err != nil {
		return nil, fmt.Errorf("generate state: %w", err)
	}
	verifier, err := uc.twitterOAuth.GenerateCodeVerifier()
	if err != nil {
		return nil, fmt.Errorf("generate verifier: %w", err)
	}
	challenge := uc.twitterOAuth.GenerateCodeChallenge(verifier)
	url := uc.twitterOAuth.GetAuthURL(state, challenge, skipLoginPrompt)

	return &OAuthURLResult{
		URL:          url,
		State:        state,
		CodeVerifier: verifier,
	}, nil
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	User         *data.User
}

func (uc *AuthUsecase) HandleTwitterCallback(ctx context.Context, code, codeVerifier string) (*LoginResult, error) {
	tokenResp, err := uc.twitterOAuth.ExchangeCode(ctx, code, codeVerifier)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	twitterUser, err := uc.twitterOAuth.GetUser(ctx, tokenResp.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("get twitter user: %w", err)
	}

	user, err := uc.userRepo.FindByTwitterID(ctx, twitterUser.Data.ID)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if user == nil {
		user = &data.User{
			TwitterID:       twitterUser.Data.ID,
			TwitterUsername: twitterUser.Data.Username,
			DisplayName:    twitterUser.Data.Name,
			AvatarURL:      twitterUser.Data.ProfileImageURL,
			AuthProviders: []data.AuthProvider{
				{
					Provider:       "twitter",
					ProviderUserID: twitterUser.Data.ID,
					LinkedAt:       time.Now(),
				},
			},
		}
		if err := uc.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("create user: %w", err)
		}
	} else {
		user.TwitterUsername = twitterUser.Data.Username
		user.DisplayName = twitterUser.Data.Name
		user.AvatarURL = twitterUser.Data.ProfileImageURL
		if err := uc.userRepo.Update(ctx, user); err != nil {
			return nil, fmt.Errorf("update user: %w", err)
		}
	}

	scopes := strings.Split(tokenResp.Scope, " ")
	conn := &data.PlatformConnection{
		UserID:              user.ID,
		Platform:            "twitter",
		PlatformUserID:      twitterUser.Data.ID,
		PlatformUsername:    twitterUser.Data.Username,
		PlatformDisplayName: twitterUser.Data.Name,
		PlatformAvatarURL:   twitterUser.Data.ProfileImageURL,
		AccessToken:         tokenResp.AccessToken,
		RefreshToken:        tokenResp.RefreshToken,
		TokenExpiresAt:      time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second),
		TokenScopes:         scopes,
		Status:              "active",
		AutoConnected:       true,
	}
	if err := uc.connRepo.Upsert(ctx, conn); err != nil {
		return nil, fmt.Errorf("upsert platform connection: %w", err)
	}

	accessToken, err := uc.jwtManager.GenerateAccessToken(user.ID.Hex(), user.TwitterUsername)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}
	refreshToken, err := uc.jwtManager.GenerateRefreshToken(user.ID.Hex(), user.TwitterUsername)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    7200,
		User:         user,
	}, nil
}

func (uc *AuthUsecase) GetCurrentUser(ctx context.Context, userID string) (*data.User, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	user, err := uc.userRepo.FindByID(ctx, oid)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

func (uc *AuthUsecase) RefreshToken(ctx context.Context, refreshTokenStr string) (*LoginResult, error) {
	claims, err := uc.jwtManager.ValidateToken(refreshTokenStr)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	accessToken, err := uc.jwtManager.GenerateAccessToken(claims.UserID, claims.TwitterUsername)
	if err != nil {
		return nil, err
	}
	newRefresh, err := uc.jwtManager.GenerateRefreshToken(claims.UserID, claims.TwitterUsername)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: newRefresh,
		ExpiresIn:    7200,
	}, nil
}
