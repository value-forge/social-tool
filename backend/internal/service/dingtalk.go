package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"social-tool/internal/config"
)

type DingTalkService struct {
	webhookURL string
	client     *http.Client
}

func NewDingTalkService(cfg *config.Config) *DingTalkService {
	return &DingTalkService{
		webhookURL: cfg.DingTalkWebhook,
		client:     &http.Client{},
	}
}

func (s *DingTalkService) SendTweet(author, text, summary, suggestion, tweetURL string, score float64, likes, replies, retweets int, publishedAt string) error {
	content := fmt.Sprintf(`📱 推特：@%s | 🕐 %s

📝 %s

💬 %s

⭐ 评分：%.1f/10 | 💡 %s

👍 %d 💬 %d 🔄 %d

🔗 %s`, author, publishedAt, text, summary, score, suggestion, likes, replies, retweets, tweetURL)

	msg := map[string]interface{}{
		"msgtype": "text",
		"text":    map[string]string{"content": content},
	}

	jsonBody, _ := json.Marshal(msg)
	resp, err := s.client.Post(s.webhookURL, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("send failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
