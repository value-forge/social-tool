package worker

import (
	"context"
	"social-tool/internal/config"
	"social-tool/internal/data"
	"social-tool/internal/service"
	"social-tool/pkg/bird"
	"social-tool/pkg/kimi"

	"go.uber.org/zap"
)

type Worker struct {
	cfg         *config.Config
	fetcher     *service.Fetcher
	aiProcessor *service.AIProcessor
	aiQueue     chan string
	logger      *zap.Logger
}

func New(cfg *config.Config, db *data.MongoDB, logger *zap.Logger) *Worker {
	aiQueue := make(chan string, 100)

	birdClient := bird.NewClient(cfg)
	kimiClient := kimi.NewClient(cfg)

	tweetRepo := data.NewTweetRepo(db.DB())
	userRepo := data.NewTwitterUserRepo(db.DB())
	monitorRepo := data.NewUserMonitoredAccountRepo(db.DB())

	dingtalk := service.NewDingTalkService(cfg)
	fetcher := service.NewFetcher(cfg, birdClient, tweetRepo, userRepo, monitorRepo, aiQueue, logger)
	aiProcessor := service.NewAIProcessor(cfg, kimiClient, dingtalk, tweetRepo, userRepo, aiQueue, logger)

	return &Worker{
		cfg: cfg, fetcher: fetcher, aiProcessor: aiProcessor, aiQueue: aiQueue, logger: logger,
	}
}

func (w *Worker) Start(ctx context.Context) {
	w.logger.Info("Starting workers", zap.Int("ai_count", w.cfg.AIProcessorCount))

	// 启动时扫描 pending 状态的推文并加入队列
	go w.enqueuePendingTweets(ctx)

	go w.fetcher.Start(ctx)

	for i := 0; i < w.cfg.AIProcessorCount; i++ {
		go w.aiProcessor.Start(ctx)
		w.logger.Info("AI Processor started", zap.Int("index", i+1))
	}

	<-ctx.Done()
	w.logger.Info("All workers stopped")
}

func (w *Worker) enqueuePendingTweets(ctx context.Context) {
	tweetRepo := w.aiProcessor.GetTweetRepo()
	pendingTweets, err := tweetRepo.ListPending(ctx)
	if err != nil {
		w.logger.Error("List pending tweets failed", zap.Error(err))
		return
	}

	w.logger.Info("Enqueuing pending tweets", zap.Int("count", len(pendingTweets)))

	for _, tweet := range pendingTweets {
		select {
		case w.aiQueue <- tweet.TweetID:
			w.logger.Info("Pending tweet queued", zap.String("tweetId", tweet.TweetID))
		case <-ctx.Done():
			return
		default:
			w.logger.Warn("Queue full, skipping pending tweet", zap.String("tweetId", tweet.TweetID))
		}
	}
}
