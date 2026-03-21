package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/social-tool/backend/internal/platform"
)

// Scraper 使用 Puppeteer/Playwright 抓取 Twitter 公开数据
type Scraper struct {
	usePlaywright bool
}

func NewScraper() *Scraper {
	return &Scraper{
		usePlaywright: checkPlaywright(),
	}
}

// checkPlaywright 检查是否安装了 Playwright
func checkPlaywright() bool {
	_, err := exec.LookPath("npx")
	if err != nil {
		return false
	}
	// 简单检查 playwright 是否可用
	cmd := exec.Command("npx", "playwright", "--version")
	err = cmd.Run()
	return err == nil
}

// GetFollowing 使用 Playwright 抓取用户的关注列表（无需 API）
func (s *Scraper) GetFollowing(ctx context.Context, username string) ([]platform.AccountInfo, error) {
	if !s.usePlaywright {
		return nil, fmt.Errorf("playwright not available, please install: npm install -g @playwright/test")
	}

	// JavaScript 脚本用于抓取关注列表
	script := `
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 访问用户的 following 页面
        await page.goto('https://twitter.com/' + process.env.TWITTER_USERNAME + '/following', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // 等待页面加载
        await page.waitForTimeout(3000);
        
        // 抓取关注列表
        const following = await page.evaluate(() => {
            const users = [];
            const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
            
            cells.forEach(cell => {
                const nameEl = cell.querySelector('[data-testid="UserName"]');
                const usernameEl = cell.querySelector('[data-testid="UserCell"] a[href^="/"]');
                const bioEl = cell.querySelector('[data-testid="UserDescription"]');
                
                if (usernameEl) {
                    const href = usernameEl.getAttribute('href');
                    const username = href ? href.replace('/', '') : '';
                    const displayName = nameEl ? nameEl.textContent.split('\n')[0] : username;
                    const bio = bioEl ? bioEl.textContent : '';
                    
                    users.push({
                        username: username,
                        display_name: displayName,
                        bio: bio,
                        platform_user_id: ''
                    });
                }
            });
            
            return users;
        });
        
        console.log(JSON.stringify(following));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
})();
`

	// 创建临时脚本文件
	tmpFile, err := os.CreateTemp("", "scrape-*.js")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())
	
	if _, err := tmpFile.WriteString(script); err != nil {
		return nil, err
	}
	tmpFile.Close()

	// 执行脚本
	cmd := exec.CommandContext(ctx, "npx", "playwright", "exec", "node", tmpFile.Name())
	cmd.Env = append(os.Environ(), "TWITTER_USERNAME="+username)
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Scraper error: %v, output: %s", err, string(output))
		return nil, fmt.Errorf("scraper failed: %w", err)
	}

	// 解析输出
	lines := strings.Split(string(output), "\n")
	var result []map[string]interface{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && line[0] == '[' {
			if err := json.Unmarshal([]byte(line), &result); err == nil {
				break
			}
		}
	}

	// 转换为 platform.AccountInfo
	accounts := make([]platform.AccountInfo, 0, len(result))
	for _, item := range result {
		username, _ := item["username"].(string)
		displayName, _ := item["display_name"].(string)
		bio, _ := item["bio"].(string)
		
		if username != "" {
			accounts = append(accounts, platform.AccountInfo{
				PlatformUserID: "",
				Username:       username,
				DisplayName:    displayName,
				AvatarURL:      "",
				Bio:            bio,
				FollowerCount:  0,
				FollowingCount: 0,
			})
		}
	}

	return accounts, nil
}

// GetTweets 使用 Playwright 抓取用户的推文（无需 API）
func (s *Scraper) GetTweets(ctx context.Context, username string) ([]platform.Post, error) {
	if !s.usePlaywright {
		return nil, fmt.Errorf("playwright not available, please install: npm install -g @playwright/test")
	}

	script := `
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto('https://twitter.com/' + process.env.TWITTER_USERNAME, {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        await page.waitForTimeout(3000);
        
        // 滚动加载更多推文
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
        }
        
        const tweets = await page.evaluate(() => {
            const posts = [];
            const articles = document.querySelectorAll('article[data-testid="tweet"]');
            
            articles.forEach(article => {
                const textEl = article.querySelector('[data-testid="tweetText"]');
                const timeEl = article.querySelector('time');
                const likeEl = article.querySelector('[data-testid="like"]');
                const retweetEl = article.querySelector('[data-testid="retweet"]');
                const replyEl = article.querySelector('[data-testid="reply"]');
                
                const text = textEl ? textEl.textContent : '';
                const time = timeEl ? timeEl.getAttribute('datetime') : '';
                
                // 提取数字
                const getCount = (el) => {
                    if (!el) return 0;
                    const text = el.textContent || '';
                    const num = text.replace(/[^0-9]/g, '');
                    return num ? parseInt(num) : 0;
                };
                
                posts.push({
                    content: text,
                    published_at: time,
                    likes: getCount(likeEl),
                    retweets: getCount(retweetEl),
                    replies: getCount(replyEl)
                });
            });
            
            return posts;
        });
        
        console.log(JSON.stringify(tweets));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
})();
`

	tmpFile, err := os.CreateTemp("", "scrape-*.js")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())
	
	if _, err := tmpFile.WriteString(script); err != nil {
		return nil, err
	}
	tmpFile.Close()

	cmd := exec.CommandContext(ctx, "npx", "playwright", "exec", "node", tmpFile.Name())
	cmd.Env = append(os.Environ(), "TWITTER_USERNAME="+username)
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Scraper error: %v", err)
		return nil, fmt.Errorf("scraper failed: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	var result []map[string]interface{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && line[0] == '[' {
			if err := json.Unmarshal([]byte(line), &result); err == nil {
				break
			}
		}
	}

	posts := make([]platform.Post, 0, len(result))
	for _, item := range result {
		content, _ := item["content"].(string)
		publishedAt, _ := item["published_at"].(string)
		likes, _ := item["likes"].(float64)
		retweets, _ := item["retweets"].(float64)
		replies, _ := item["replies"].(float64)
		
		publishedTime, _ := time.Parse(time.RFC3339, publishedAt)
		
		posts = append(posts, platform.Post{
			PlatformPostID:    "",
			AuthorUsername:    username,
			AuthorDisplayName: username,
			AuthorAvatarURL:   "",
			Content:           content,
			PublishedAt:       publishedTime,
			LikeCount:         int64(likes),
			RepostCount:       int64(retweets),
			ReplyCount:        int64(replies),
			PostURL:           fmt.Sprintf("https://x.com/%s/status/", username),
		})
	}

	return posts, nil
}
