package twitter

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/social-tool/backend/internal/platform"
)

// parseTwitterAPIErrorBody 解析 X API 返回的 problem+json 或 errors 数组，便于排查 403/401。
func parseTwitterAPIErrorBody(body []byte) string {
	s := strings.TrimSpace(string(body))
	if s == "" {
		return "(empty body)"
	}
	var problem struct {
		Title  string `json:"title"`
		Detail string `json:"detail"`
	}
	if json.Unmarshal(body, &problem) == nil && (problem.Title != "" || problem.Detail != "") {
		if problem.Detail != "" {
			return strings.TrimSpace(problem.Title + " — " + problem.Detail)
		}
		return problem.Title
	}
	var wrap struct {
		Errors []struct {
			Message string `json:"message"`
			Detail  string `json:"detail"`
			Title   string `json:"title"`
		} `json:"errors"`
	}
	if json.Unmarshal(body, &wrap) == nil && len(wrap.Errors) > 0 {
		e := wrap.Errors[0]
		if e.Message != "" {
			return e.Message
		}
		if e.Detail != "" {
			return e.Detail
		}
		if e.Title != "" {
			return e.Title
		}
	}
	if len(s) > 800 {
		return s[:800] + "…"
	}
	return s
}

type Adapter struct{}

func NewAdapter() *Adapter {
	return &Adapter{}
}

func (a *Adapter) Platform() platform.PlatformType { return platform.PlatformTwitter }
func (a *Adapter) DisplayName() string               { return "Twitter" }
func (a *Adapter) IconURL() string                 { return "https://abs.twimg.com/favicons/twitter.3.ico" }
func (a *Adapter) IsAvailable() bool               { return true }

func (a *Adapter) GetOAuthURL(_ context.Context, _ string, _ string) (string, error) {
	return "", nil // handled by auth module directly for MVP
}

func (a *Adapter) HandleOAuthCallback(_ context.Context, _ string) (*platform.PlatformToken, error) {
	return nil, nil
}

func (a *Adapter) RefreshToken(_ context.Context, _ string) (*platform.PlatformToken, error) {
	return nil, nil // TODO: implement token refresh
}

func (a *Adapter) FetchPosts(_ context.Context, _ *platform.PlatformToken, _ string, _ time.Time) ([]platform.Post, error) {
	return nil, nil // TODO: implement with Twitter API v2
}

func (a *Adapter) FetchPostComments(_ context.Context, _ *platform.PlatformToken, _ string, _ int) ([]platform.PostComment, error) {
	return nil, nil // TODO
}

func (a *Adapter) FetchFeed(_ context.Context, _ *platform.PlatformToken) ([]platform.Post, error) {
	return nil, nil // TODO
}

func (a *Adapter) FetchTrending(_ context.Context, _ *platform.PlatformToken) ([]platform.TrendingRaw, error) {
	return nil, nil // TODO
}

func (a *Adapter) GetAccountInfo(_ context.Context, _ *platform.PlatformToken, _ string) (*platform.AccountInfo, error) {
	return nil, nil // TODO
}

// GetFollowing 调用 X API v2 GET /2/users/:id/following（需 OAuth2 user context + follows.read）。
func (a *Adapter) GetFollowing(ctx context.Context, tok *platform.PlatformToken, cursor string) ([]platform.AccountInfo, string, error) {
	if tok == nil || tok.AccessToken == "" || tok.PlatformUserID == "" {
		return nil, "", fmt.Errorf("missing access token or platform user id")
	}

	apiURL, err := url.Parse(fmt.Sprintf("https://api.twitter.com/2/users/%s/following", url.PathEscape(tok.PlatformUserID)))
	if err != nil {
		return nil, "", err
	}
	q := apiURL.Query()
	q.Set("max_results", "100")
	q.Set("user.fields", "profile_image_url,description,public_metrics")
	if cursor != "" {
		q.Set("pagination_token", cursor)
	}
	apiURL.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL.String(), nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("twitter request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("twitter api %d: %s", resp.StatusCode, parseTwitterAPIErrorBody(body))
	}

	var parsed struct {
		Data []struct {
			ID              string `json:"id"`
			Name            string `json:"name"`
			Username        string `json:"username"`
			ProfileImageURL string `json:"profile_image_url"`
			Description     string `json:"description"`
			PublicMetrics   struct {
				FollowersCount  int64 `json:"followers_count"`
				FollowingCount  int64 `json:"following_count"`
			} `json:"public_metrics"`
		} `json:"data"`
		Meta struct {
			NextToken   string `json:"next_token"`
			ResultCount int    `json:"result_count"`
		} `json:"meta"`
		Errors []struct {
			Detail string `json:"detail"`
			Title  string `json:"title"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, "", fmt.Errorf("decode response: %w", err)
	}
	if len(parsed.Errors) > 0 {
		msg := parsed.Errors[0].Detail
		if msg == "" {
			msg = parsed.Errors[0].Title
		}
		return nil, "", fmt.Errorf("twitter: %s", msg)
	}

	out := make([]platform.AccountInfo, 0, len(parsed.Data))
	for _, row := range parsed.Data {
		out = append(out, platform.AccountInfo{
			PlatformUserID: row.ID,
			Username:       row.Username,
			DisplayName:    row.Name,
			AvatarURL:      row.ProfileImageURL,
			Bio:            row.Description,
			FollowerCount:  row.PublicMetrics.FollowersCount,
			FollowingCount: row.PublicMetrics.FollowingCount,
		})
	}
	return out, parsed.Meta.NextToken, nil
}

func (a *Adapter) SearchAccounts(_ context.Context, _ *platform.PlatformToken, _ string) ([]platform.AccountInfo, error) {
	return nil, nil // TODO
}

func (a *Adapter) BuildPostURL(post platform.Post) string {
	return "https://x.com/" + post.AuthorUsername + "/status/" + post.PlatformPostID
}

func (a *Adapter) GetRateLimits() platform.RateLimitConfig {
	return platform.RateLimitConfig{
		RequestsPerWindow: 300,
		WindowDuration:    15 * time.Minute,
	}
}
