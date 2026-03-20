package platform

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type PlatformType string

const (
	PlatformTwitter     PlatformType = "twitter"
	PlatformXiaohongshu PlatformType = "xiaohongshu"
	PlatformTikTok      PlatformType = "tiktok"
	PlatformDouyin      PlatformType = "douyin"
	PlatformFarcaster   PlatformType = "farcaster"
	PlatformTelegram    PlatformType = "telegram"
	PlatformDiscord     PlatformType = "discord"
	PlatformInstagram   PlatformType = "instagram"
)

type PlatformAdapter interface {
	Platform() PlatformType
	DisplayName() string
	IconURL() string
	IsAvailable() bool

	GetOAuthURL(ctx context.Context, callbackURL string, state string) (string, error)
	HandleOAuthCallback(ctx context.Context, code string) (*PlatformToken, error)
	RefreshToken(ctx context.Context, refreshToken string) (*PlatformToken, error)

	FetchPosts(ctx context.Context, token *PlatformToken, accountID string, since time.Time) ([]Post, error)
	FetchPostComments(ctx context.Context, token *PlatformToken, postID string, limit int) ([]PostComment, error)
	FetchFeed(ctx context.Context, token *PlatformToken) ([]Post, error)
	FetchTrending(ctx context.Context, token *PlatformToken) ([]TrendingRaw, error)
	GetAccountInfo(ctx context.Context, token *PlatformToken, username string) (*AccountInfo, error)
	GetFollowing(ctx context.Context, token *PlatformToken, cursor string) ([]AccountInfo, string, error)
	SearchAccounts(ctx context.Context, token *PlatformToken, query string) ([]AccountInfo, error)

	BuildPostURL(post Post) string
	GetRateLimits() RateLimitConfig
}

type PlatformRegistry struct {
	mu       sync.RWMutex
	adapters map[PlatformType]PlatformAdapter
}

func NewPlatformRegistry() *PlatformRegistry {
	return &PlatformRegistry{
		adapters: make(map[PlatformType]PlatformAdapter),
	}
}

func (r *PlatformRegistry) Register(adapter PlatformAdapter) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.adapters[adapter.Platform()] = adapter
}

func (r *PlatformRegistry) Get(platform PlatformType) (PlatformAdapter, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	adapter, ok := r.adapters[platform]
	if !ok {
		return nil, fmt.Errorf("platform %s not registered", platform)
	}
	return adapter, nil
}

func (r *PlatformRegistry) ListAll() []PlatformAdapter {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]PlatformAdapter, 0, len(r.adapters))
	for _, a := range r.adapters {
		result = append(result, a)
	}
	return result
}

func (r *PlatformRegistry) ListAvailable() []PlatformAdapter {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []PlatformAdapter
	for _, a := range r.adapters {
		if a.IsAvailable() {
			result = append(result, a)
		}
	}
	return result
}
