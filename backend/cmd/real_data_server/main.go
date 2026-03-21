package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// BirdFollowing 关注列表结构
type BirdFollowing struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	FollowersCount  int    `json:"followersCount"`
	FollowingCount  int    `json:"followingCount"`
	ProfileImageURL string `json:"profileImageUrl"`
	IsBlueVerified  bool   `json:"isBlueVerified"`
}

// Response API 响应
type Response struct {
	Accounts   []BirdFollowing `json:"accounts"`
	Count      int             `json:"count"`
	Source     string          `json:"source"`
	FetchedAt  string          `json:"fetched_at"`
}

func main() {
	http.HandleFunc("/api/real-following", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// 尝试读取缓存文件
		data, err := os.ReadFile("following_real.json")
		if err != nil {
			// 文件不存在，执行 bird 命令获取
			cmd := exec.Command("bird", "following", "-n", "100", "--json", "--chrome-profile", "Default")
			output, err := cmd.CombinedOutput()
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": "bird-cli failed: %v"}`, err), 500)
				return
			}
			
			// 过滤日志行
			lines := strings.Split(string(output), "\n")
			var jsonLines []string
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "[") || strings.HasPrefix(line, "{") {
					jsonLines = append(jsonLines, line)
				}
			}
			data = []byte(strings.Join(jsonLines, "\n"))
			
			// 保存缓存
			os.WriteFile("following_real.json", data, 0644)
		}

		var accounts []BirdFollowing
		if err := json.Unmarshal(data, &accounts); err != nil {
			http.Error(w, fmt.Sprintf(`{"error": "parse failed: %v"}`, err), 500)
			return
		}

		resp := Response{
			Accounts:  accounts,
			Count:     len(accounts),
			Source:    "bird-cli-real",
			FetchedAt: time.Now().Format(time.RFC3339),
		}

		json.NewEncoder(w).Encode(resp)
	})

	fmt.Println("Server starting on :8080")
	fmt.Println("API: http://localhost:8080/api/real-following")
	http.ListenAndServe(":8080", nil)
}
