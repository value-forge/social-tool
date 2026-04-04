package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"social-tool/internal/data"
	"strings"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Worker 推特抓取和AI处理工作器
type Worker struct {
	userRepo        *data.UserRepo
	tweetRepo       *data.TweetRepo
	monitorRepo     *data.MonitorRepo
	twitterUserRepo *data.TwitterUserRepo
	log             *log.Helper
	ticker          *time.Ticker
	aiQueue         chan string // AI处理队列，存储 tweetId
	kimiAPIKey      string
	dingTalkWebhook string
}

// NewWorker 创建 Worker
func NewWorker(
	userRepo *data.UserRepo,
	tweetRepo *data.TweetRepo,
	monitorRepo *data.MonitorRepo,
	twitterUserRepo *data.TwitterUserRepo,
	logger log.Logger,
) *Worker {
	return &Worker{
		userRepo:        userRepo,
		tweetRepo:       tweetRepo,
		monitorRepo:     monitorRepo,
		twitterUserRepo: twitterUserRepo,
		log:             log.NewHelper(logger),
		ticker:          time.NewTicker(5 * time.Minute),
		aiQueue:         make(chan string, 100),
		kimiAPIKey:      "", // 从环境变量读取
		dingTalkWebhook: "",
	}
}

// Start 启动 worker
func (w *Worker) Start(ctx context.Context) {
	w.log.Info("Worker starting...")

	// 启动 AI Processor（可配置多个并发）
	processorCount := 3
	for i := 0; i < processorCount; i++ {
		go w.aiProcessor(ctx, i)
	}

	// 立即执行一次抓取
	w.fetchTweets(ctx)

	for {
		select {
		case <-ctx.Done():
			w.ticker.Stop()
			w.log.Info("Worker stopped")
			return
		case <-w.ticker.C:
			w.fetchTweets(ctx)
		}
	}
}

// fetchTweets 抓取推文（Fetcher）
func (w *Worker) fetchTweets(ctx context.Context) {
	w.log.Info("Fetching tweets...")

	// 1. 获取所有监控中的 Twitter 用户
	monitors, _, err := w.monitorRepo.ListByUser(ctx, primitive.NilObjectID, 1, 1000)
	if err != nil {
		w.log.Errorf("Failed to list monitors: %v", err)
		return
	}

	// 去重获取唯一的 twitterUserIds
	twitterUserIdMap := make(map[primitive.ObjectID]bool)
	for _, m := range monitors {
		if m.Status == 1 { // active
			twitterUserIdMap[m.TwitterUserID] = true
		}
	}

	// 2. 遍历每个监控账号
	for twitterUserId := range twitterUserIdMap {
		twitterUser, err := w.twitterUserRepo.GetByID(ctx, twitterUserId)
		if err != nil || twitterUser == nil {
			w.log.Errorf("Failed to get twitter user: %v", err)
			continue
		}

		w.log.Infof("Fetching tweets for @%s", twitterUser.Username)

		// 3. 调用 bird-cli 抓取推文
		tweets, err := w.fetchWithBirdCLI(twitterUser.Username)
		if err != nil {
			w.log.Errorf("Failed to fetch tweets for @%s: %v", twitterUser.Username, err)
			continue
		}

		// 4. 处理该账号的推文
		for _, tweet := range tweets {
			w.processTweet(ctx, twitterUserId, tweet)
		}

		// 5. 账号间延迟 2-3秒，防 rate limit
		time.Sleep(2 * time.Second + time.Duration(time.Now().UnixNano()%1000)*time.Millisecond)
	}

	w.log.Info("Fetch completed")
}

// fetchWithBirdCLI 使用 bird-cli 抓取推文
func (w *Worker) fetchWithBirdCLI(username string) ([]*BirdTweet, error) {
	// 调用 bird-cli: bird user-tweets <username> -n 20 --json
	cmd := exec.Command("bird", "user-tweets", username, "-n", "20", "--json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("bird-cli failed: %w, output: %s", err, string(output))
	}

	// 解析 JSON 输出
	var tweets []*BirdTweet
	if err := json.Unmarshal(output, &tweets); err != nil {
		// 尝试逐行解析（bird-cli 可能每行一个 JSON）
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			var tweet BirdTweet
			if err := json.Unmarshal([]byte(line), &tweet); err == nil {
				tweets = append(tweets, &tweet)
			}
		}
	}

	return tweets, nil
}

// processTweet 处理单条推文
func (w *Worker) processTweet(ctx context.Context, twitterUserId primitive.ObjectID, birdTweet *BirdTweet) {
	// 查重
	existingTweet, err := w.tweetRepo.GetByTweetID(ctx, birdTweet.ID)
	if err != nil {
		w.log.Errorf("Failed to check existing tweet: %v", err)
		return
	}

	if existingTweet != nil {
		// 已存在：UPDATE metrics
		w.tweetRepo.UpdateMetrics(ctx, birdTweet.ID, data.Metrics{
			RetweetCount: birdTweet.Metrics.RetweetCount,
			ReplyCount:   birdTweet.Metrics.ReplyCount,
			LikeCount:    birdTweet.Metrics.LikeCount,
			ViewCount:    birdTweet.Metrics.ViewCount,
		})
		w.log.Infof("Updated metrics for tweet %s", birdTweet.ID)
	} else {
		// 不存在：INSERT 新推文
		tweet := &data.Tweet{
			TwitterUserID: twitterUserId,
			TweetID:       birdTweet.ID,
			URL:           birdTweet.URL,
			Text:          birdTweet.Text,
			TwitterID:     birdTweet.AuthorID,
			Metrics: data.Metrics{
				RetweetCount: birdTweet.Metrics.RetweetCount,
				ReplyCount:   birdTweet.Metrics.ReplyCount,
				LikeCount:    birdTweet.Metrics.LikeCount,
				ViewCount:    birdTweet.Metrics.ViewCount,
			},
			Type:        birdTweet.Type,
			PublishedAt: birdTweet.PublishedAt,
			FetchedAt:   time.Now(),
			AIStatus:    -1, // 待分析
		}

		if err := w.tweetRepo.Create(ctx, tweet); err != nil {
			w.log.Errorf("Failed to create tweet: %v", err)
			return
		}

		w.log.Infof("Created new tweet %s, queued for AI processing", birdTweet.ID)

		// 发送到 AI 处理队列
		select {
		case w.aiQueue <- birdTweet.ID:
			w.log.Infof("Queued tweet %s for AI processing", birdTweet.ID)
		default:
			w.log.Warnf("AI queue full, dropped tweet %s", birdTweet.ID)
		}
	}
}

// aiProcessor AI 处理器
func (w *Worker) aiProcessor(ctx context.Context, id int) {
	w.log.Infof("AI Processor %d started", id)

	for {
		select {
		case <-ctx.Done():
			w.log.Infof("AI Processor %d stopped", id)
			return
		case tweetId := <-w.aiQueue:
			w.processAI(ctx, tweetId)
		}
	}
}

// processAI 处理 AI 分析
func (w *Worker) processAI(ctx context.Context, tweetId string) {
	w.log.Infof("Processing AI for tweet %s", tweetId)

	// 1. 查询推文
	tweet, err := w.tweetRepo.GetByTweetID(ctx, tweetId)
	if err != nil || tweet == nil {
		w.log.Errorf("Failed to get tweet %s: %v", tweetId, err)
		return
	}

	// 2. 获取作者信息
	author, err := w.twitterUserRepo.GetByID(ctx, tweet.TwitterUserID)
	if err != nil {
		w.log.Errorf("Failed to get author: %v", err)
	}

	// 3. 调用 Kimi API
	suggestions, err := w.callKimiAPI(tweet.Text)
	if err != nil {
		w.log.Errorf("Kimi API failed for tweet %s: %v", tweetId, err)
		// 标记 AI 分析失败
		w.tweetRepo.UpdateAIStatus(ctx, tweetId, -2)
		return
	}

	// 4. 更新推文 AI 结果
	if err := w.tweetRepo.UpdateAIResult(ctx, tweetId, suggestions); err != nil {
		w.log.Errorf("Failed to update AI result: %v", err)
		return
	}

	w.log.Infof("AI analysis completed for tweet %s, score: %.1f", tweetId, suggestions.Score)

	// 5. 发送钉钉通知
	authorName := "Unknown"
	if author != nil {
		authorName = author.Username
	}

	if err := w.sendDingTalk(authorName, tweet.Text, suggestions); err != nil {
		w.log.Errorf("Failed to send DingTalk: %v", err)
	}
}

// callKimiAPI 调用 Kimi API
func (w *Worker) callKimiAPI(text string) (*data.AISuggestions, error) {
	if w.kimiAPIKey == "" {
		// 如果没有配置 API Key，返回模拟数据
		return &data.AISuggestions{
			Score:   7.0,
			Summary: "这是一条测试总结",
			Suggestion: data.Suggestion{
				Type:    "general",
				Content: "这是一个测试建议",
				Reason:  "测试原因",
			},
		}, nil
	}

	// TODO: 实现真实的 Kimi API 调用
	return nil, fmt.Errorf("Kimi API not implemented")
}

// sendDingTalk 发送钉钉通知
func (w *Worker) sendDingTalk(author, text string, suggestions *data.AISuggestions) error {
	if w.dingTalkWebhook == "" {
		w.log.Warn("DingTalk webhook not configured, skipping notification")
		return nil
	}

	content := fmt.Sprintf(`📱 推特：@%s

📝 %s

💬 %s

⭐ 评分：%.1f/10
💡 %s`, author, text, suggestions.Summary, suggestions.Score, suggestions.Suggestion.Content)

	msg := map[string]interface{}{
		"msgtype": "text",
		"text":    map[string]string{"content": content},
	}

	jsonBody, _ := json.Marshal(msg)
	resp, err := http.Post(w.dingTalkWebhook, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("send failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}

// BirdTweet bird-cli 返回的推文结构
type BirdTweet struct {
	ID          string    `json:"id"`
	URL         string    `json:"url"`
	Text        string    `json:"text"`
	AuthorID    string    `json:"author_id"`
	Type        string    `json:"type"`
	PublishedAt time.Time `json:"published_at"`
	Metrics     struct {
		RetweetCount int `json:"retweet_count"`
		ReplyCount   int `json:"reply_count"`
		LikeCount    int `json:"like_count"`
		ViewCount    int `json:"view_count"`
	} `json:"metrics"`
}