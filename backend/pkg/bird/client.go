package bird

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"social-tool/internal/config"
	"strings"
	"time"
)

// Tweet bird返回的推文
type Tweet struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	CreatedAt string `json:"createdAt"`
	Author    Author `json:"author"`
	ReplyCount   int `json:"replyCount"`
	RetweetCount int `json:"retweetCount"`
	LikeCount    int `json:"likeCount"`
}

type Author struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type Client struct {
	authToken string
	ct0       string
	timeout   time.Duration
}

func NewClient(cfg *config.Config) *Client {
	return &Client{
		authToken: cfg.BirdAuthToken,
		ct0:       cfg.BirdCT0,
		timeout:   30 * time.Second,
	}
}

func (c *Client) UserTweets(ctx context.Context, username string, count int) ([]*Tweet, error) {
	args := []string{
		"user-tweets", username,
		"-n", fmt.Sprintf("%d", count),
		"--json",
		"--auth-token", c.authToken,
		"--ct0", c.ct0,
	}

	cmd := exec.CommandContext(ctx, "bird", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("bird-cli failed: %w, stderr: %s", err, stderr.String())
	}

	var tweets []*Tweet
	if err := json.Unmarshal(stdout.Bytes(), &tweets); err != nil {
		output := strings.TrimSpace(stdout.String())
		if output == "" || output == "[]" {
			return []*Tweet{}, nil
		}
		return nil, fmt.Errorf("unmarshal tweets failed: %w", err)
	}

	return tweets, nil
}

// GetMetrics 返回点赞数、回复数、转发数、浏览数
func (t *Tweet) GetMetrics() (int, int, int, int) {
	return t.LikeCount, t.ReplyCount, t.RetweetCount, 0
}