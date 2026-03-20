package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

const (
	twitterAuthURL = "https://twitter.com/i/oauth2/authorize"
	twitterTokenURL = "https://api.twitter.com/2/oauth2/token"
	twitterUserURL  = "https://api.twitter.com/2/users/me"
)

type TwitterOAuth struct {
	ClientID     string
	ClientSecret string
	CallbackURL  string
	Scopes       []string
}

type TwitterTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
}

type TwitterUser struct {
	Data struct {
		ID              string `json:"id"`
		Name            string `json:"name"`
		Username        string `json:"username"`
		ProfileImageURL string `json:"profile_image_url"`
	} `json:"data"`
}

func NewTwitterOAuth(clientID, clientSecret, callbackURL string) *TwitterOAuth {
	return &TwitterOAuth{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		CallbackURL:  callbackURL,
		Scopes:       []string{"tweet.read", "users.read", "follows.read", "offline.access"},
	}
}

func (t *TwitterOAuth) GenerateCodeVerifier() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (t *TwitterOAuth) GenerateCodeChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

func (t *TwitterOAuth) GenerateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (t *TwitterOAuth) GetAuthURL(state, codeChallenge string) string {
	params := url.Values{
		"response_type":         {"code"},
		"client_id":             {t.ClientID},
		"redirect_uri":          {t.CallbackURL},
		"scope":                 {strings.Join(t.Scopes, " ")},
		"state":                 {state},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
	}
	return fmt.Sprintf("%s?%s", twitterAuthURL, params.Encode())
}

func (t *TwitterOAuth) ExchangeCode(ctx context.Context, code, codeVerifier string) (*TwitterTokenResponse, error) {
	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {t.CallbackURL},
		"code_verifier": {codeVerifier},
		"client_id":     {t.ClientID},
	}

	// Debug log
	fmt.Printf("[DEBUG] ExchangeCode: client_id=%s, callback_url=%s\n", t.ClientID, t.CallbackURL)
	fmt.Printf("[DEBUG] ExchangeCode: code=%s, verifier=%s...\n", code[:min(10, len(code))], codeVerifier[:min(10, len(codeVerifier))])

	req, err := http.NewRequestWithContext(ctx, "POST", twitterTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(t.ClientID, t.ClientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("[DEBUG] Twitter response (status %d): %s\n", resp.StatusCode, string(body))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("twitter token error (status %d): %s", resp.StatusCode, string(body))
	}

	var tokenResp TwitterTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	return &tokenResp, nil
}

func (t *TwitterOAuth) GetUser(ctx context.Context, accessToken string) (*TwitterUser, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", twitterUserURL+"?user.fields=profile_image_url", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("twitter user error (status %d): %s", resp.StatusCode, string(body))
	}

	var user TwitterUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("decode user: %w", err)
	}
	return &user, nil
}

// RefreshAccessToken 使用 refresh_token 换取新的 access_token（X OAuth 2.0）。
// 需在授权时包含 offline.access 才会下发 refresh_token。
func (t *TwitterOAuth) RefreshAccessToken(ctx context.Context, refreshToken string) (*TwitterTokenResponse, error) {
	if refreshToken == "" {
		return nil, fmt.Errorf("missing refresh token")
	}
	data := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {t.ClientID},
	}
	req, err := http.NewRequestWithContext(ctx, "POST", twitterTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(t.ClientID, t.ClientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("refresh token request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("twitter refresh error (status %d): %s", resp.StatusCode, string(body))
	}

	var tokenResp TwitterTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("decode refresh response: %w", err)
	}
	if tokenResp.AccessToken == "" {
		return nil, fmt.Errorf("twitter refresh: empty access_token")
	}
	return &tokenResp, nil
}
