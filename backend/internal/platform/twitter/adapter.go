package twitter

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/social-tool/backend/internal/platform"
)

// isMockMode 判断是否启用 mock 模式（无需付费 Twitter API）
func isMockMode() bool {
	return os.Getenv("TWITTER_MOCK_MODE") == "true" || os.Getenv("TWITTER_MOCK_MODE") == "1"
}

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

func (a *Adapter) FetchPosts(ctx context.Context, tok *platform.PlatformToken, accountID string, since time.Time) ([]platform.Post, error) {
	// Mock 模式：返回模拟推文数据
	if isMockMode() {
		return getMockPosts(accountID), nil
	}
	return nil, fmt.Errorf("real Twitter API not implemented in mock mode")
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
// Mock 模式：设置环境变量 TWITTER_MOCK_MODE=true 可返回模拟数据，无需付费 API。
func (a *Adapter) GetFollowing(ctx context.Context, tok *platform.PlatformToken, cursor string) ([]platform.AccountInfo, string, error) {
	// Mock 模式：返回模拟数据供开发测试
	if isMockMode() {
		return getMockFollowing(cursor), "", nil
	}

	if tok == nil || tok.AccessToken == "" || tok.PlatformUserID == "" {
		return nil, "", fmt.Errorf("missing access token or platform user id")
	}

	apiURL, err := url.Parse(fmt.Sprintf("https://api.twitter.com/2/users/%s/following", url.PathEscape(tok.PlatformUserID)))
	if err != nil {
		return nil, "", err
	}
	q := apiURL.Query()
	// max_results：1–1000；仅请求基础字段，避免部分 X 项目对 public_metrics 等字段返回 400/403
	q.Set("max_results", "100")
	q.Set("user.fields", "profile_image_url,description")
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

// getMockPosts 返回模拟推文数据（开发测试用）
func getMockPosts(accountID string) []platform.Post {
	now := time.Now()
	
	// 根据账号ID返回不同的模拟推文
	posts := []platform.Post{
		{
			PlatformPostID:   "tweet_001",
			AuthorUsername:   "elonmusk",
			AuthorDisplayName: "Elon Musk",
			AuthorAvatarURL:  "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
			Content:          "Exciting progress on Starship. Full stack test flight soon! 🚀",
			PublishedAt:      now.Add(-3 * time.Hour),
			LikeCount:        125000,
			RepostCount:      35000,
			ReplyCount:       8200,
			PostURL:          "https://x.com/elonmusk/status/tweet_001",
		},
		{
			PlatformPostID:   "tweet_002",
			AuthorUsername:   "elonmusk",
			AuthorDisplayName: "Elon Musk",
			AuthorAvatarURL:  "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
			Content:          "AI is the most important technology humanity is working on right now. The pace of progress is staggering.",
			PublishedAt:      now.Add(-24 * time.Hour),
			LikeCount:        89000,
			RepostCount:      22000,
			ReplyCount:       5400,
			PostURL:          "https://x.com/elonmusk/status/tweet_002",
		},
		{
			PlatformPostID:   "tweet_003",
			AuthorUsername:   "naval",
			AuthorDisplayName: "Naval",
			AuthorAvatarURL:  "https://pbs.twimg.com/profile_images/1256841238298292232/ycqwaMI2_400x400.jpg",
			Content:          "The best founders are missionaries, not mercenaries. They're driven by a mission, not money.",
			PublishedAt:      now.Add(-5 * time.Hour),
			LikeCount:        45000,
			RepostCount:      12000,
			ReplyCount:       1800,
			PostURL:          "https://x.com/naval/status/tweet_003",
		},
		{
			PlatformPostID:   "tweet_004",
			AuthorUsername:   "pmarca",
			AuthorDisplayName: "Marc Andreessen",
			AuthorAvatarURL:  "https://pbs.twimg.com/profile_images/1273322133633626112/4oK2Rcjh_400x400.jpg",
			Content:          "Software is eating the world, but AI is eating software. The transformation is happening faster than anyone predicted.",
			PublishedAt:      now.Add(-12 * time.Hour),
			LikeCount:        32000,
			RepostCount:      8900,
			ReplyCount:       1200,
			PostURL:          "https://x.com/pmarca/status/tweet_004",
		},
		{
			PlatformPostID:   "tweet_005",
			AuthorUsername:   "balajis",
			AuthorDisplayName: "Balaji Srinivasan",
			AuthorAvatarURL:  "https://pbs.twimg.com/profile_images/1430873482256617472/nNqSTn0r_400x400.jpg",
			Content:          "The network state is the next evolution of governance. Technology allows us to build communities that transcend borders.",
			PublishedAt:      now.Add(-8 * time.Hour),
			LikeCount:        28000,
			RepostCount:      7500,
			ReplyCount:       980,
			PostURL:          "https://x.com/balajis/status/tweet_005",
		},
	}
	
	return posts
}

// getMockFollowing 返回模拟的关注列表数据（开发测试用）
func getMockFollowing(cursor string) []platform.AccountInfo {
	// 模拟分页：如果 cursor 不为空，返回空表示没有更多数据
	if cursor != "" {
		return []platform.AccountInfo{}
	}

	return []platform.AccountInfo{
		{
			PlatformUserID: "1234567890",
			Username:       "elonmusk",
			DisplayName:    "Elon Musk",
			AvatarURL:      "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
			Bio:            "Chief Twit",
			FollowerCount:  180000000,
			FollowingCount: 500,
		},
		{
			PlatformUserID: "2345678901",
			Username:       "naval",
			DisplayName:    "Naval",
			AvatarURL:      "https://pbs.twimg.com/profile_images/1256841238298292232/ycqwaMI2_400x400.jpg",
			Bio:            "The @naval podcast. Co-founder @angellist.",
			FollowerCount:  2500000,
			FollowingCount: 1000,
		},
		{
			PlatformUserID: "3456789012",
			Username:       "pmarca",
			DisplayName:    "Marc Andreessen",
			AvatarURL:      "https://pbs.twimg.com/profile_images/1273322133633626112/4oK2Rcjh_400x400.jpg",
			Bio:            "Software eats the world.",
			FollowerCount:  1800000,
			FollowingCount: 2000,
		},
		{
			PlatformUserID: "4567890123",
			Username:       "balajis",
			DisplayName:    "Balaji Srinivasan",
			AvatarURL:      "https://pbs.twimg.com/profile_images/1430873482256617472/nNqSTn0r_400x400.jpg",
			Bio:            "The Network State. Previously CTO @ Coinbase, GP @ a16z.",
			FollowerCount:  1200000,
			FollowingCount: 800,
		},
		{
			PlatformUserID: "5678901234",
			Username:       "sama",
			DisplayName:    "Sam Altman",
			AvatarURL:      "https://pbs.twimg.com/profile_images/1686218460532002816/8Y5QFDtB_400x400.jpg",
			Bio:            "CEO of OpenAI",
			FollowerCount:  3200000,
			FollowingCount: 300,
		},
	}
}
