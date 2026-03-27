package fxtwitter

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "https://api.fxtwitter.com"

// UserProfile fxtwitter 返回的用户信息
type UserProfile struct {
	ID          string `json:"id"`
	ScreenName  string `json:"screen_name"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Location    string `json:"location"`
	URL         string `json:"url"`
	AvatarURL   string `json:"avatar_url"`
	BannerURL   string `json:"banner_url"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
	Tweets      int    `json:"tweets"`
	Likes       int    `json:"likes"`
	MediaCount  int    `json:"media_count"`
	Joined      string `json:"joined"`
	Protected   bool   `json:"protected"`
	Website     *struct {
		URL        string `json:"url"`
		DisplayURL string `json:"display_url"`
	} `json:"website"`
	Verification *struct {
		Verified bool   `json:"verified"`
		Type     string `json:"type"`
	} `json:"verification"`
}

type apiResponse struct {
	Code    int          `json:"code"`
	Message string       `json:"message"`
	User    *UserProfile `json:"user"`
}

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// GetUser 获取 Twitter 用户完整 profile
func (c *Client) GetUser(ctx context.Context, username string) (*UserProfile, error) {
	url := fmt.Sprintf("%s/%s", baseURL, username)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fxtwitter API error: HTTP %d, body: %s", resp.StatusCode, string(body))
	}

	var result apiResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if result.Code != 200 || result.User == nil {
		return nil, fmt.Errorf("fxtwitter error: code=%d, message=%s", result.Code, result.Message)
	}

	return result.User, nil
}

// GetWebsiteURL 从 UserProfile 提取 website URL
func (u *UserProfile) GetWebsiteURL() string {
	if u.Website != nil {
		return u.Website.URL
	}
	return ""
}

// IsVerified 从 UserProfile 提取认证状态
func (u *UserProfile) IsVerified() bool {
	if u.Verification != nil {
		return u.Verification.Verified
	}
	return false
}
