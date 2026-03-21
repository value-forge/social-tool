package bird

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
	"unicode"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/social-tool/backend/internal/data"
	"github.com/social-tool/backend/internal/platform"
)

// extractFirstJSONObject 从 bird 混合日志输出中截取第一个完整 JSON 对象（大括号配对）。
func extractFirstJSONObject(output string) ([]byte, error) {
	start := strings.Index(output, "{")
	if start < 0 {
		return nil, fmt.Errorf("no JSON object in output")
	}
	depth := 0
	for i := start; i < len(output); i++ {
		switch output[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return []byte(output[start : i+1]), nil
			}
		}
	}
	return nil, fmt.Errorf("unbalanced JSON braces in bird output")
}

// extractFirstJSONArray 从 bird 混合日志输出中截取第一个完整 JSON 数组（中括号配对）。
func extractFirstJSONArray(output string) ([]byte, error) {
	start := strings.Index(output, "[")
	if start < 0 {
		return nil, fmt.Errorf("no JSON array in output")
	}
	depth := 0
	inString := false
	escapeNext := false
	for i := start; i < len(output); i++ {
		ch := output[i]
		if escapeNext {
			escapeNext = false
			continue
		}
		if ch == '\\' {
			escapeNext = true
			continue
		}
		if ch == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}
		switch ch {
		case '[', '{':
			depth++
		case ']', '}':
			depth--
			if depth == 0 {
				return []byte(output[start : i+1]), nil
			}
		}
	}
	return nil, fmt.Errorf("unbalanced JSON brackets in bird output")
}

func isNumericID(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 5 {
		return false
	}
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

// findUserRestIDInJSON 在 about 等 JSON 中查找 X 数字用户 ID（优先 restId）。
func findUserRestIDInJSON(v interface{}) string {
	switch x := v.(type) {
	case map[string]interface{}:
		for _, key := range []string{"restId", "rest_id", "id"} {
			if val, ok := x[key]; ok {
				switch t := val.(type) {
				case string:
					if isNumericID(t) {
						return t
					}
				case float64:
					s := fmt.Sprintf("%.0f", t)
					if isNumericID(s) {
						return s
					}
				}
			}
		}
		for _, vv := range x {
			if id := findUserRestIDInJSON(vv); id != "" {
				return id
			}
		}
	case []interface{}:
		for _, item := range x {
			if id := findUserRestIDInJSON(item); id != "" {
				return id
			}
		}
	}
	return ""
}

// Client 封装 bird-cli 调用
type Client struct {
	chromeProfile string
}

// NewClient 创建 bird 客户端
func NewClient(chromeProfile string) *Client {
	if chromeProfile == "" {
		chromeProfile = "Default"
	}
	return &Client{
		chromeProfile: chromeProfile,
	}
}

// Tweet 表示 bird-cli 返回的推文结构
type Tweet struct {
	ID             string `json:"id"`
	Text           string `json:"text"`
	CreatedAt      string `json:"createdAt"`
	ReplyCount     int    `json:"replyCount"`
	RetweetCount   int    `json:"retweetCount"`
	LikeCount      int    `json:"likeCount"`
	ConversationID string `json:"conversationId"`
	Author         struct {
		Username       string `json:"username"`
		Name           string `json:"name"`
		IsBlueVerified bool   `json:"isBlueVerified"`
	} `json:"author"`
	AuthorID string `json:"authorId"`
	Article  *struct {
		Title       string `json:"title"`
		PreviewText string `json:"previewText"`
	} `json:"article,omitempty"`
	QuotedTweet *struct {
		ID       string `json:"id"`
		Text     string `json:"text"`
		Author   struct {
			Username       string `json:"username"`
			Name           string `json:"name"`
			IsBlueVerified bool   `json:"isBlueVerified"`
		} `json:"author"`
		Media []struct {
			Type string `json:"type"`
			URL  string `json:"url"`
		} `json:"media,omitempty"`
	} `json:"quotedTweet,omitempty"`
	Media []struct {
		Type        string `json:"type"`
		URL         string `json:"url"`
		Width       int    `json:"width"`
		Height      int    `json:"height"`
		PreviewURL  string `json:"previewUrl"`
		VideoURL    string `json:"videoUrl,omitempty"`
		DurationMs  int    `json:"durationMs,omitempty"`
	} `json:"media,omitempty"`
}

// UserTweetsResponse bird-cli user-tweets 的响应结构
type UserTweetsResponse struct {
	Tweets     []Tweet `json:"tweets"`
	NextCursor *string `json:"nextCursor"`
}

// GetUserTweets 获取用户推文
func (c *Client) GetUserTweets(ctx context.Context, username string, count int) ([]Tweet, error) {
	if count <= 0 || count > 100 {
		count = 20 // 默认 20 条
	}

	// 移除 @ 前缀
	username = strings.TrimPrefix(username, "@")

	// 构建命令
	args := []string{
		"user-tweets",
		"-n", fmt.Sprintf("%d", count),
		"--json",
		username,
	}

	// 优先使用 Chrome profile（更稳定）
	// 只有显式设置 BIRD_USE_TOKEN=true 时才使用 AUTH_TOKEN/CT0
	authToken := os.Getenv("AUTH_TOKEN")
	ct0Token := os.Getenv("CT0")
	useToken := os.Getenv("BIRD_USE_TOKEN") == "true"

	if useToken && authToken != "" && ct0Token != "" {
		args = append(args, "--auth-token", authToken, "--ct0", ct0Token)
	} else {
		args = append(args, "--chrome-profile", c.chromeProfile)
	}

	cmd := exec.CommandContext(ctx, "bird", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("bird command failed: %w, output: %s", err, string(output))
	}

	raw, err := extractFirstJSONObject(string(output))
	if err != nil {
		return nil, fmt.Errorf("no JSON output found in bird response: %w", err)
	}

	var resp UserTweetsResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse bird output: %w", err)
	}

	return resp.Tweets, nil
}

type followingRow struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	FollowersCount  int    `json:"followersCount"`
	FollowingCount  int    `json:"followingCount"`
	ProfileImageURL string `json:"profileImageUrl"`
	IsBlueVerified  bool   `json:"isBlueVerified"`
}

func followingRowsToAccounts(rows []followingRow) []platform.AccountInfo {
	accounts := make([]platform.AccountInfo, 0, len(rows))
	for _, u := range rows {
		avatarURL := u.ProfileImageURL
		avatarURL = strings.Replace(avatarURL, "_normal.jpg", "_400x400.jpg", 1)
		avatarURL = strings.Replace(avatarURL, "_normal.png", "_400x400.png", 1)
		accounts = append(accounts, platform.AccountInfo{
			PlatformUserID: u.ID,
			Username:       u.Username,
			DisplayName:    u.Name,
			AvatarURL:      avatarURL,
			Bio:            u.Description,
			FollowerCount:  int64(u.FollowersCount),
			FollowingCount: int64(u.FollowingCount),
			IsBlueVerified: u.IsBlueVerified,
		})
	}
	return accounts
}

// resolveUserRestID 通过 `bird about <username> --json` 解析数字用户 ID（供 following --user 使用）。
func (c *Client) resolveUserRestID(ctx context.Context, username string) (string, error) {
	username = strings.TrimPrefix(strings.TrimSpace(username), "@")
	if username == "" {
		return "", fmt.Errorf("username is empty")
	}
	cmd := exec.CommandContext(ctx, "bird", "about", "--chrome-profile", c.chromeProfile, "--json", username)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("bird about failed: %w, output: %s", err, string(output))
	}
	raw, err := extractFirstJSONObject(string(output))
	if err != nil {
		return "", err
	}
	var root interface{}
	if err := json.Unmarshal(raw, &root); err != nil {
		return "", fmt.Errorf("decode about json: %w", err)
	}
	id := findUserRestIDInJSON(root)
	if id == "" {
		return "", fmt.Errorf("no numeric user id in about JSON")
	}
	return id, nil
}

// GetFollowing 调用 bird following 获取当前 Chrome 登录用户的关注列表。
// 注意：bird following 不带 --user 参数时会使用当前 Chrome 登录的身份，无需额外解析用户名。
func (c *Client) GetFollowing(ctx context.Context, platformUserID, username string, count int, cursor string) ([]platform.AccountInfo, string, error) {
	if count <= 0 {
		count = 50
	}
	if count > 1000 {
		count = 1000
	}

	args := []string{
		"following",
		"-n", fmt.Sprintf("%d", count),
		"--json",
	}

	// 支持通过环境变量传递 Twitter token（当 Chrome cookies 不可用时）
	authToken := os.Getenv("AUTH_TOKEN")
	ct0Token := os.Getenv("CT0")
	useToken := os.Getenv("BIRD_USE_TOKEN") == "true"

	if useToken && authToken != "" && ct0Token != "" {
		args = append(args, "--auth-token", authToken, "--ct0", ct0Token)
	} else {
		args = append(args, "--chrome-profile", c.chromeProfile)
	}

	if strings.TrimSpace(cursor) != "" {
		args = append(args, "--cursor", strings.TrimSpace(cursor))
	}

	// 注意：bird following 不带 --user 时会自动使用当前 Chrome 登录的用户
	// 这避免了调用 bird about 解析用户 ID 的额外延迟
	uid := strings.TrimSpace(platformUserID)
	if uid != "" {
		args = append(args, "--user", uid)
	}
	// 不再尝试通过 username 解析 ID，直接使用当前 Chrome 用户

	cmd := exec.CommandContext(ctx, "bird", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, "", fmt.Errorf("bird command failed: %w, output: %s", err, string(output))
	}

	raw, err := extractFirstJSONArray(string(output))
	if err != nil {
		return nil, "", fmt.Errorf("parse bird following output: %w", err)
	}

	// bird following 返回的是直接数组 [{...}, {...}]
	var rows []followingRow
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, "", fmt.Errorf("failed to parse bird following JSON: %w", err)
	}

	// bird following 目前不支持返回 nextCursor
	return followingRowsToAccounts(rows), "", nil
}

// parseFollowingFromOutput 从文本输出解析关注列表
func (c *Client) parseFollowingFromOutput(output string) ([]platform.AccountInfo, error) {
	// bird following 可能输出纯文本格式
	// 格式通常是：@username Name
	accounts := []platform.AccountInfo{}
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// 查找 @username 格式
		if idx := strings.Index(line, "@"); idx >= 0 {
			parts := strings.Fields(line[idx:])
			if len(parts) > 0 {
				username := strings.TrimPrefix(parts[0], "@")
				displayName := ""
				if len(parts) > 1 {
					displayName = strings.Join(parts[1:], " ")
				}
				accounts = append(accounts, platform.AccountInfo{
					Username:    username,
					DisplayName: displayName,
				})
			}
		}
	}

	return accounts, nil
}

// ConvertToPlatformPosts 将 bird Tweet 转换为 platform.Post
func ConvertToPlatformPosts(tweets []Tweet) []platform.Post {
	posts := make([]platform.Post, 0, len(tweets))

	for _, t := range tweets {
		// 解析时间
		publishedAt, _ := time.Parse(time.RubyDate, t.CreatedAt)
		if publishedAt.IsZero() {
			// 尝试其他格式
			publishedAt, _ = time.Parse("Mon Jan 02 15:04:05 +0000 2006", t.CreatedAt)
		}

		post := platform.Post{
			PlatformPostID:       t.ID,
			AuthorUsername:       t.Author.Username,
			AuthorDisplayName:    t.Author.Name,
			AuthorIsBlueVerified: t.Author.IsBlueVerified,
			Content:              t.Text,
			PublishedAt:          publishedAt,
			LikeCount:            int64(t.LikeCount),
			RepostCount:          int64(t.RetweetCount),
			ReplyCount:           int64(t.ReplyCount),
			PostURL:              fmt.Sprintf("https://x.com/%s/status/%s", t.Author.Username, t.ID),
		}

		// 提取媒体
		if len(t.Media) > 0 {
			post.MediaURLs = make([]string, 0, len(t.Media))
			for _, m := range t.Media {
				post.MediaURLs = append(post.MediaURLs, m.URL)
			}
		}

		posts = append(posts, post)
	}

	return posts
}

// TweetComment bird-cli 返回的评论结构
type TweetComment struct {
	ID                string `json:"id"`
	Text              string `json:"text"`
	CreatedAt         string `json:"createdAt"`
	LikeCount         int    `json:"likeCount"`
	ReplyCount        int    `json:"replyCount"`
	Author            struct {
		Username       string `json:"username"`
		Name           string `json:"name"`
		IsBlueVerified bool   `json:"isBlueVerified"`
	} `json:"author"`
	AuthorID          string `json:"authorId"`
	InReplyToStatusID string `json:"inReplyToStatusId,omitempty"`
}

// GetTweetComments 获取推文的评论
func (c *Client) GetTweetComments(ctx context.Context, tweetID string, count int) ([]TweetComment, error) {
	// bird replies 没有 -n 参数，使用 --max-pages 控制数量
	// 每页大约 20 条评论，所以 count/20 得到页数
	maxPages := 1
	if count > 20 {
		maxPages = count / 20
		if maxPages > 3 {
			maxPages = 3 // 最多 3 页
		}
	}

	// 构建命令 - 使用正确的命令名 "replies"
	args := []string{
		"replies",
		"--max-pages", fmt.Sprintf("%d", maxPages),
		"--json",
		tweetID,
	}

	// 优先使用 AUTH_TOKEN/CT0（如果环境变量强制指定）
	// 否则使用 Chrome profile（更稳定，避免证书问题）
	authToken := os.Getenv("AUTH_TOKEN")
	ct0Token := os.Getenv("CT0")
	useToken := os.Getenv("BIRD_USE_TOKEN") == "true" // 需要显式设置才用 token

	if useToken && authToken != "" && ct0Token != "" {
		fmt.Printf("[bird] GetTweetComments: tweetID=%s, using AUTH_TOKEN/CT0\n", tweetID)
		args = append(args, "--auth-token", authToken, "--ct0", ct0Token)
	} else {
		fmt.Printf("[bird] GetTweetComments: tweetID=%s, using chrome-profile=%s\n", tweetID, c.chromeProfile)
		args = append(args, "--chrome-profile", c.chromeProfile)
	}

	cmd := exec.CommandContext(ctx, "bird", args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		fmt.Printf("[bird] replies error: %v, output: %s\n", err, string(output))
		// bird replies 可能会因为没有评论或推文不存在而返回错误
		if strings.Contains(string(output), "not found") ||
			strings.Contains(string(output), "No replies") ||
			strings.Contains(string(output), "Could not find") ||
			strings.Contains(string(output), "certificate") ||
			strings.Contains(string(output), "Unauthorized") ||
			len(output) == 0 {
			return []TweetComment{}, nil
		}
		return nil, fmt.Errorf("bird command failed: %w", err)
	}

	raw, err := extractFirstJSONArray(string(output))
	if err != nil {
		// 可能是空数组或没有评论
		return []TweetComment{}, nil
	}

	var comments []TweetComment
	if err := json.Unmarshal(raw, &comments); err != nil {
		return nil, fmt.Errorf("failed to parse bird output: %w", err)
	}

	fmt.Printf("[bird] fetched %d comments for tweet %s\n", len(comments), tweetID)

	// 限制返回数量
	if len(comments) > count && count > 0 {
		comments = comments[:count]
	}

	return comments, nil
}

// ConvertToDataComments 将 bird 评论转换为 data.TweetComment
func ConvertToDataComments(birdComments []TweetComment, tweetID primitive.ObjectID, platformPostID string) []data.TweetComment {
	comments := make([]data.TweetComment, 0, len(birdComments))
	now := time.Now()

	for _, c := range birdComments {
		publishedAt, _ := time.Parse(time.RubyDate, c.CreatedAt)
		if publishedAt.IsZero() {
			publishedAt, _ = time.Parse("Mon Jan 02 15:04:05 +0000 2006", c.CreatedAt)
		}

		comment := data.TweetComment{
			TweetID:              tweetID,
			PlatformCommentID:    c.ID,
			PlatformPostID:       platformPostID,
			AuthorUsername:       c.Author.Username,
			AuthorDisplayName:    c.Author.Name,
			AuthorAvatarURL:      "", // bird replies 不返回头像URL，需要后续补充
			AuthorIsBlueVerified: c.Author.IsBlueVerified,
			Content:              c.Text,
			LikeCount:            int64(c.LikeCount),
			PublishedAt:          publishedAt,
			FetchedAt:            now,
			CreatedAt:            now,
			UpdatedAt:            now,
		}

		// 判断是否是回复评论
		if c.InReplyToStatusID != "" && c.InReplyToStatusID != platformPostID {
			comment.IsReply = true
		}

		comments = append(comments, comment)
	}

	return comments
}

// IsAvailable 检查 bird-cli 是否可用
func IsAvailable() bool {
	cmd := exec.Command("bird", "--version")
	err := cmd.Run()
	return err == nil
}