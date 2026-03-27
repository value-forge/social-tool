package service

import (
	"context"
	"fmt"
	"social-tool/internal/config"
	"social-tool/internal/data"
	"social-tool/pkg/bird"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.uber.org/zap"
)

type Fetcher struct {
	cfg         *config.Config
	birdClient  *bird.Client
	tweetRepo   *data.TweetRepo
	userRepo    *data.TwitterUserRepo
	monitorRepo *data.UserMonitoredAccountRepo
	aiQueue     chan string
	logger      *zap.Logger
}

func NewFetcher(cfg *config.Config, birdClient *bird.Client, tweetRepo *data.TweetRepo,
	userRepo *data.TwitterUserRepo, monitorRepo *data.UserMonitoredAccountRepo,
	aiQueue chan string, logger *zap.Logger) *Fetcher {
	return &Fetcher{
		cfg: cfg, birdClient: birdClient, tweetRepo: tweetRepo,
		userRepo: userRepo, monitorRepo: monitorRepo, aiQueue: aiQueue, logger: logger,
	}
}

func (f *Fetcher) Start(ctx context.Context) {
	f.logger.Info("Fetcher started")
	ticker := time.NewTicker(f.cfg.FetchInterval)
	defer ticker.Stop()

	f.fetch(ctx)

	for {
		select {
		case <-ticker.C:
			f.fetch(ctx)
		case <-ctx.Done():
			f.logger.Info("Fetcher stopped")
			return
		}
	}
}

func (f *Fetcher) fetch(ctx context.Context) {
	f.logger.Info("Starting fetch cycle")

	accounts, err := f.monitorRepo.ListActive(ctx)
	if err != nil {
		f.logger.Error("List monitored accounts failed", zap.Error(err))
		return
	}

	f.logger.Info("Found accounts", zap.Int("count", len(accounts)))

	for _, account := range accounts {
		user, err := f.userRepo.GetByID(ctx, account.TwitterUserID)
		if err != nil || user == nil {
			f.logger.Error("Get user failed", zap.Error(err))
			continue
		}

		f.logger.Info("Fetching tweets", zap.String("username", user.Username))

		tweets, err := f.birdClient.UserTweets(ctx, user.Username, 20)
		if err != nil {
			f.logger.Error("Fetch tweets failed", zap.String("username", user.Username), zap.Error(err))
			continue
		}

		f.logger.Info("Fetched", zap.String("username", user.Username), zap.Int("count", len(tweets)))

		for _, t := range tweets {
			if err := f.processTweet(ctx, t, user.ID); err != nil {
				f.logger.Error("Process tweet failed", zap.String("tweetId", t.ID), zap.Error(err))
			}
		}

		time.Sleep(2 * time.Second)
	}

	f.logger.Info("Fetch cycle completed")
}

func (f *Fetcher) processTweet(ctx context.Context, t *bird.Tweet, twitterUserID primitive.ObjectID) error {
	existing, err := f.tweetRepo.GetByTweetID(ctx, t.ID)
	if err != nil {
		return fmt.Errorf("check existing failed: %w", err)
	}

	if existing != nil {
		likeCount, replyCount, retweetCount, viewCount := t.GetMetrics()
		metrics := data.Metrics{
			RetweetCount: retweetCount,
			ReplyCount:   replyCount,
			LikeCount:    likeCount,
			ViewCount:    viewCount,
		}
		return f.tweetRepo.UpdateMetrics(ctx, t.ID, metrics)
	}

	tweet := &data.Tweet{
		TwitterUserID: twitterUserID,
		TweetID:       t.ID,
		URL:           fmt.Sprintf("https://x.com/%s/status/%s", t.Author.Username, t.ID),
		Text:          t.Text,
		TwitterID:     t.Author.ID,
		Metrics: func() data.Metrics {
			likeCount, replyCount, retweetCount, viewCount := t.GetMetrics()
			return data.Metrics{
				RetweetCount: retweetCount,
				ReplyCount:   replyCount,
				LikeCount:    likeCount,
				ViewCount:    viewCount,
			}
		}(),
		Type:        "original",
		PublishedAt: parseTime(t.CreatedAt),
		FetchedAt:   time.Now(),
	}

	if err := f.tweetRepo.Create(ctx, tweet); err != nil {
		return fmt.Errorf("create tweet failed: %w", err)
	}

	f.logger.Info("New tweet saved", zap.String("tweetId", t.ID))

	select {
	case f.aiQueue <- t.ID:
		f.logger.Info("Tweet queued", zap.String("tweetId", t.ID))
	default:
		f.logger.Warn("Queue full", zap.String("tweetId", t.ID))
	}

	return nil
}

func parseTime(t string) time.Time {
	layouts := []string{
		"Mon Jan 02 15:04:05 +0000 2006",
		time.RFC3339,
	}
	for _, layout := range layouts {
		if tm, err := time.Parse(layout, t); err == nil {
			return tm
		}
	}
	return time.Now()
}
