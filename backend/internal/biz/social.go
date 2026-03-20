package biz

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/data"
	"github.com/social-tool/backend/internal/platform"
	"github.com/social-tool/backend/internal/platform/twitter"
)

type SocialUsecase struct {
	connRepo     *data.PlatformConnectionRepo
	twitter      *twitter.Adapter
	twitterOAuth *auth.TwitterOAuth
}

func NewSocialUsecase(
	connRepo *data.PlatformConnectionRepo,
	tw *twitter.Adapter,
	twitterOAuth *auth.TwitterOAuth,
) *SocialUsecase {
	return &SocialUsecase{
		connRepo:     connRepo,
		twitter:      tw,
		twitterOAuth: twitterOAuth,
	}
}

// tokenNeedsRefresh access_token 已过期或即将过期（预留 90 秒时钟偏差）
func tokenNeedsRefresh(expiresAt time.Time) bool {
	if expiresAt.IsZero() {
		return true
	}
	return time.Now().Add(90 * time.Second).After(expiresAt)
}

// GetTwitterFollowing 使用当前用户保存在库中的 X OAuth access token 拉取关注列表（分页）。
// 若 access_token 过期，会尝试用 refresh_token 刷新后再请求（需登录时授权 offline.access）。
func (uc *SocialUsecase) GetTwitterFollowing(ctx context.Context, userIDHex string, cursor string) ([]platform.AccountInfo, string, error) {
	oid, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return nil, "", fmt.Errorf("invalid user id")
	}
	conn, err := uc.connRepo.FindByUserAndPlatform(ctx, oid, "twitter")
	if err != nil {
		return nil, "", err
	}
	if conn == nil || conn.AccessToken == "" {
		return nil, "", fmt.Errorf("未绑定 X 账号，请重新登录授权")
	}
	if conn.PlatformUserID == "" {
		return nil, "", fmt.Errorf("缺少 X 用户 ID，请重新登录授权")
	}

	if tokenNeedsRefresh(conn.TokenExpiresAt) {
		if conn.RefreshToken == "" {
			return nil, "", fmt.Errorf("X 访问令牌已过期且没有 refresh_token，请重新登录（授权时需包含 offline.access）")
		}
		tokResp, err := uc.twitterOAuth.RefreshAccessToken(ctx, conn.RefreshToken)
		if err != nil {
			return nil, "", fmt.Errorf("刷新 X 令牌失败，请重新登录: %w", err)
		}
		conn.AccessToken = tokResp.AccessToken
		if tokResp.RefreshToken != "" {
			conn.RefreshToken = tokResp.RefreshToken
		}
		conn.TokenExpiresAt = time.Now().Add(time.Duration(tokResp.ExpiresIn) * time.Second)
		if tokResp.Scope != "" {
			conn.TokenScopes = strings.Fields(tokResp.Scope)
		}
		if err := uc.connRepo.Upsert(ctx, conn); err != nil {
			return nil, "", fmt.Errorf("保存刷新后的令牌失败: %w", err)
		}
	}

	tok := &platform.PlatformToken{
		AccessToken:    conn.AccessToken,
		RefreshToken:   conn.RefreshToken,
		ExpiresAt:      conn.TokenExpiresAt,
		PlatformUserID: conn.PlatformUserID,
	}
	return uc.twitter.GetFollowing(ctx, tok, cursor)
}
