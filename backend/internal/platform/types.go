package platform

import "time"

type PlatformToken struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	Scopes       []string
	// PlatformUserID 平台侧用户 ID（如 X 的 numeric id），调用 /users/:id/following 等接口时需要
	PlatformUserID string
	RawData        map[string]interface{}
}

type AccountInfo struct {
	PlatformUserID string
	Username       string
	DisplayName    string
	AvatarURL      string
	Bio            string
	FollowerCount  int64
	FollowingCount int64
}

type Post struct {
	PlatformPostID    string
	AuthorUsername    string
	AuthorDisplayName string
	AuthorAvatarURL  string
	Content          string
	MediaURLs        []string
	PostURL          string
	PublishedAt      time.Time
	LikeCount        int64
	RepostCount      int64
	ReplyCount       int64
	IsReply          bool
	Language         string
	PlatformExtra    map[string]interface{}
}

type PostComment struct {
	PlatformCommentID string
	AuthorUsername    string
	AuthorDisplayName string
	AuthorAvatarURL  string
	Content          string
	LikeCount        int64
	PublishedAt      time.Time
	Rank             int
}

type TrendingRaw struct {
	Name        string
	Query       string
	URL         string
	TweetVolume int64
}

type RateLimitConfig struct {
	RequestsPerWindow int
	WindowDuration    time.Duration
}
