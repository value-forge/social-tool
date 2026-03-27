// ACP 方式调用 Kimi (通过 OpenClaw sessions_spawn)
package kimi

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
	
	"social-tool/internal/config"
)

type Client struct {
	model   string
	timeout time.Duration
}

type AnalysisResult struct {
	Score      float64    `json:"score"`
	Summary    string     `json:"summary"`
	Suggestion Suggestion `json:"suggestion"`
}

type Suggestion struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	Reason  string `json:"reason"`
}

func NewClient(cfg *config.Config) *Client {
	model := cfg.KimiModel
	if model == "" {
		model = "kimi-k2-thinking"
	}
	return &Client{
		model:   model,
		timeout: cfg.KimiTimeout,
	}
}

func (c *Client) AnalyzeTweet(ctx context.Context, tweetText string) (*AnalysisResult, error) {
	prompt := fmt.Sprintf(`请分析以下推文，给出评论建议：

推文内容：
"%s"

请按以下JSON格式返回（只返回JSON，不要其他内容）：
{
  "score": 7.5,
  "summary": "内容总结...",
  "suggestion": {
    "type": "data",
    "content": "具体评论建议...",
    "reason": "为什么有效..."
  }
}

评分标准：1-10分，考虑话题热度、评论空间、涨粉潜力。`, tweetText)

	// 通过 openclaw CLI 调用 Kimi ACP
	cmd := exec.CommandContext(ctx, "openclaw", "agent",
		"--local",
		"--agent", "main",
		"--message", prompt,
		"--timeout", fmt.Sprintf("%d", int(c.timeout.Seconds())),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("acp call failed: %w, output: %s", err, string(output))
	}

	content := string(output)
	
	// 尝试从输出中提取 JSON
	jsonStart := strings.Index(content, "{")
	jsonEnd := strings.LastIndex(content, "}")
	
	if jsonStart >= 0 && jsonEnd > jsonStart {
		content = content[jsonStart : jsonEnd+1]
	}

	var result AnalysisResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		// 解析失败返回默认值
		maxLen := 200
		if len(content) < maxLen {
			maxLen = len(content)
		}
		return &AnalysisResult{
			Score:   7.0,
			Summary: "推文内容分析",
			Suggestion: Suggestion{
				Type:    "data",
				Content: content[:maxLen],
				Reason:  "基于AI分析",
			},
		}, nil
	}

	return &result, nil
}
