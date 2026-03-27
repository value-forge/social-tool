package service

import (
	"context"
	"fmt"
	"social-tool/internal/config"
	"social-tool/internal/data"
	"social-tool/pkg/kimi"
	"time"

	"go.uber.org/zap"
)

type AIProcessor struct {
	cfg        *config.Config
	kimiClient *kimi.Client
	dingtalk   *DingTalkService
	tweetRepo  *data.TweetRepo
	userRepo   *data.TwitterUserRepo
	aiQueue    chan string
	logger     *zap.Logger
}

func NewAIProcessor(cfg *config.Config, kimiClient *kimi.Client, dingtalk *DingTalkService,
	tweetRepo *data.TweetRepo, userRepo *data.TwitterUserRepo,
	aiQueue chan string, logger *zap.Logger) *AIProcessor {
	return &AIProcessor{
		cfg: cfg, kimiClient: kimiClient, dingtalk: dingtalk,
		tweetRepo: tweetRepo, userRepo: userRepo, aiQueue: aiQueue, logger: logger,
	}
}

func (p *AIProcessor) GetTweetRepo() *data.TweetRepo {
	return p.tweetRepo
}

func (p *AIProcessor) Start(ctx context.Context) {
	p.logger.Info("AI Processor started")
	for {
		select {
		case tweetID := <-p.aiQueue:
			if err := p.process(ctx, tweetID); err != nil {
				p.logger.Error("Process failed", zap.String("tweetId", tweetID), zap.Error(err))
			}
		case <-ctx.Done():
			p.logger.Info("AI Processor stopped")
			return
		}
	}
}

func (p *AIProcessor) process(ctx context.Context, tweetID string) error {
	p.logger.Info("Processing", zap.String("tweetId", tweetID))

	tweet, err := p.tweetRepo.GetByTweetID(ctx, tweetID)
	if err != nil {
		return fmt.Errorf("get tweet failed: %w", err)
	}
	if tweet == nil {
		return fmt.Errorf("tweet not found: %s", tweetID)
	}

	ctx, cancel := context.WithTimeout(ctx, p.cfg.KimiTimeout)
	defer cancel()

	result, err := p.kimiClient.AnalyzeTweet(ctx, tweet.Text)
	if err != nil {
		return fmt.Errorf("kimi analyze failed: %w", err)
	}

	p.logger.Info("AI analysis completed", zap.String("tweetId", tweetID), zap.Float64("score", result.Score))

	suggestions := &data.AISuggestions{
		Score:   result.Score,
		Summary: result.Summary,
		Suggestion: data.Suggestion{
			Type:    result.Suggestion.Type,
			Content: result.Suggestion.Content,
			Reason:  result.Suggestion.Reason,
		},
	}

	if err := p.tweetRepo.UpdateAIResult(ctx, tweetID, suggestions); err != nil {
		return fmt.Errorf("update result failed: %w", err)
	}

	author, err := p.userRepo.GetByID(ctx, tweet.TwitterUserID)
	if err != nil || author == nil {
		author = &data.TwitterUser{Username: "unknown"}
	}

	if err := p.dingtalk.SendTweet(
		author.Username, tweet.Text, result.Summary, result.Suggestion.Content,
		tweet.URL, result.Score, tweet.Metrics.LikeCount, tweet.Metrics.ReplyCount, tweet.Metrics.RetweetCount,
		tweet.PublishedAt.In(time.FixedZone("CST", 8*3600)).Format("01-02 15:04"),
	); err != nil {
		return fmt.Errorf("send dingtalk failed: %w", err)
	}

	p.logger.Info("DingTalk sent", zap.String("tweetId", tweetID))
	return nil
}
