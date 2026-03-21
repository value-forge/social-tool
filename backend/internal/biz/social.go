package biz

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/bird"
	"github.com/social-tool/backend/internal/data"
	"github.com/social-tool/backend/internal/platform"
	"github.com/social-tool/backend/internal/platform/twitter"
)

type SocialUsecase struct {
	connRepo             *data.PlatformConnectionRepo
	twitter              *twitter.Adapter
	twitterOAuth         *auth.TwitterOAuth
	birdClient           *bird.Client
	followingRepo        *data.TwitterFollowingRepo
	monitoredAccountRepo *data.MonitoredAccountRepo
	tweetRepo            *data.TweetRepo
	tweetCommentRepo     *data.TweetCommentRepo
}

func NewSocialUsecase(
	connRepo *data.PlatformConnectionRepo,
	tw *twitter.Adapter,
	twitterOAuth *auth.TwitterOAuth,
	followingRepo *data.TwitterFollowingRepo,
	monitoredAccountRepo *data.MonitoredAccountRepo,
	tweetRepo *data.TweetRepo,
	tweetCommentRepo *data.TweetCommentRepo,
) *SocialUsecase {
	return &SocialUsecase{
		connRepo:             connRepo,
		twitter:              tw,
		twitterOAuth:         twitterOAuth,
		birdClient:           bird.NewClient(""), // 使用默认 Chrome profile
		followingRepo:        followingRepo,
		monitoredAccountRepo: monitoredAccountRepo,
		tweetRepo:            tweetRepo,
		tweetCommentRepo:     tweetCommentRepo,
	}
}

// useBirdCLI 必须为 true：业务侧只走 bird-cli，不设则直接报错（无 Twitter API / Mock 兜底）。
// 默认启用 bird-cli，可通过 TWITTER_USE_BIRD=false 禁用
func useBirdCLI() bool {
	env := os.Getenv("TWITTER_USE_BIRD")
	if env == "false" || env == "0" {
		return false
	}
	// 默认返回 true，因为项目只使用 bird-cli
	return true
}

// getDefaultTwitterUsername 可选：显式指定要解析的 X 用户名（无 OAuth 数字 ID 时经 bird about 换 id）。
func getDefaultTwitterUsername() string {
	return os.Getenv("TWITTER_USERNAME")
}

// GetTwitterFollowing 仅通过 bird-cli 获取关注列表（需 TWITTER_USE_BIRD=true、本机安装 bird、Chrome 已登录 X）。
// 用户身份：优先 OAuth 保存的 platform_user_id；否则 TWITTER_USERNAME / platform_username（经 bird about 解析）；皆无则用 Chrome 当前登录账号。
func (uc *SocialUsecase) GetTwitterFollowing(ctx context.Context, userIDHex string, cursor string) ([]platform.AccountInfo, string, error) {
	if !useBirdCLI() {
		return nil, "", fmt.Errorf("关注列表仅支持 bird-cli：请设置环境变量 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, "", fmt.Errorf("未检测到 bird 命令，请安装 bird-cli 并加入 PATH")
	}

	oid, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return nil, "", fmt.Errorf("invalid user id")
	}
	conn, _ := uc.connRepo.FindByUserAndPlatform(ctx, oid, "twitter")

	platformUID := ""
	uname := ""
	if conn != nil {
		platformUID = strings.TrimSpace(conn.PlatformUserID)
		uname = strings.TrimPrefix(strings.TrimSpace(conn.PlatformUsername), "@")
	}
	if env := strings.TrimPrefix(strings.TrimSpace(getDefaultTwitterUsername()), "@"); env != "" {
		uname = env
	}

	return uc.birdClient.GetFollowing(ctx, platformUID, uname, 100, cursor)
}

// GetTwitterPosts 仅通过 bird-cli 拉取用户时间线（查询参数 account_id 为目标 X 用户名，不含 @）。
func (uc *SocialUsecase) GetTwitterPosts(ctx context.Context, _ string, accountID string) ([]platform.Post, error) {
	if !useBirdCLI() {
		return nil, fmt.Errorf("推文仅支持 bird-cli：请设置环境变量 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, fmt.Errorf("未检测到 bird 命令，请安装 bird-cli 并加入 PATH")
	}
	if strings.TrimSpace(accountID) == "" {
		return nil, fmt.Errorf("缺少 account_id（要查询的 X 用户名）")
	}
	tweets, err := uc.birdClient.GetUserTweets(ctx, accountID, 50)
	if err != nil {
		return nil, err
	}
	return bird.ConvertToPlatformPosts(tweets), nil
}

// GetTwitterPostsByBird 直接使用 bird-cli 获取推文（同样要求 TWITTER_USE_BIRD=true）。
func (uc *SocialUsecase) GetTwitterPostsByBird(ctx context.Context, username string, count int) ([]platform.Post, error) {
	if !useBirdCLI() {
		return nil, fmt.Errorf("请设置 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, fmt.Errorf("未检测到 bird 命令")
	}
	tweets, err := uc.birdClient.GetUserTweets(ctx, username, count)
	if err != nil {
		return nil, fmt.Errorf("bird-cli error: %w", err)
	}
	return bird.ConvertToPlatformPosts(tweets), nil
}

// GetFollowingByBird 获取关注列表（优先从数据库读取，没有再用 bird 拉取并存入数据库）
func (uc *SocialUsecase) GetFollowingByBird(ctx context.Context, userIDHex string, username string, count int) ([]platform.AccountInfo, error) {
	// 解析用户ID（如果不是有效的 ObjectID，使用基于 userIDHex 生成的固定 ObjectID）
	var userID primitive.ObjectID
	if parsedID, err := primitive.ObjectIDFromHex(userIDHex); err == nil {
		userID = parsedID
	} else {
		// 使用 userIDHex 的 MD5 哈希生成固定的 ObjectID
		// 这样同一 userIDHex 始终映射到同一 ObjectID
		hash := md5.Sum([]byte(userIDHex))
		// MongoDB ObjectID 是 12 字节，我们取 MD5 的前 12 字节
		fixedID, _ := primitive.ObjectIDFromHex(hex.EncodeToString(hash[:12]))
		if fixedID.IsZero() {
			// 如果转换失败，生成一个新的 ObjectID
			fixedID = primitive.NewObjectID()
		}
		userID = fixedID
	}

	// 1. 先查数据库
	dbFollowing, err := uc.followingRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("database query failed: %w", err)
	}

	// 2. 如果数据库有数据，直接返回
	if len(dbFollowing) > 0 {
		// 转换为 platform.AccountInfo
		accounts := make([]platform.AccountInfo, 0, len(dbFollowing))
		for _, f := range dbFollowing {
			accounts = append(accounts, platform.AccountInfo{
				PlatformUserID: f.PlatformUserID,
				Username:       f.Username,
				DisplayName:    f.DisplayName,
				AvatarURL:      f.AvatarURL,
				Bio:            f.Bio,
				FollowerCount:  f.FollowerCount,
				FollowingCount: f.FollowingCount,
				IsBlueVerified: f.IsBlueVerified,
			})
		}
		return accounts, nil
	}

	// 3. 数据库没有数据，用 bird 拉取
	if !useBirdCLI() {
		return nil, fmt.Errorf("请设置 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, fmt.Errorf("未检测到 bird 命令")
	}

	u := strings.TrimPrefix(strings.TrimSpace(username), "@")
	accounts, _, err := uc.birdClient.GetFollowing(ctx, "", u, count, "")
	if err != nil {
		return nil, fmt.Errorf("bird-cli error: %w", err)
	}

	// 4. 存入数据库
	now := time.Now()
	dbRecords := make([]data.TwitterFollowing, 0, len(accounts))
	for _, acc := range accounts {
		dbRecords = append(dbRecords, data.TwitterFollowing{
			UserID:         userID,
			PlatformUserID: acc.PlatformUserID,
			Username:       acc.Username,
			DisplayName:    acc.DisplayName,
			AvatarURL:      acc.AvatarURL,
			Bio:            acc.Bio,
			FollowerCount:  acc.FollowerCount,
			FollowingCount: acc.FollowingCount,
			IsBlueVerified: acc.IsBlueVerified,
			FetchedAt:      now,
		})
	}

	if err := uc.followingRepo.BulkUpsert(ctx, userID, dbRecords); err != nil {
		// 存入数据库失败只记录日志，不影响返回数据
		fmt.Printf("[WARN] Failed to save following to database: %v\n", err)
	}

	return accounts, nil
}

// RefreshFollowing 强制刷新关注列表（删除旧数据，重新拉取）
func (uc *SocialUsecase) RefreshFollowing(ctx context.Context, userIDHex string, username string, count int) ([]platform.AccountInfo, error) {
	// 解析用户ID
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	// 1. 删除旧数据
	if err := uc.followingRepo.DeleteByUserID(ctx, userID); err != nil {
		return nil, fmt.Errorf("failed to delete old following: %w", err)
	}

	// 2. 用 bird 拉取新数据
	if !useBirdCLI() {
		return nil, fmt.Errorf("请设置 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, fmt.Errorf("未检测到 bird 命令")
	}

	u := strings.TrimPrefix(strings.TrimSpace(username), "@")
	accounts, _, err := uc.birdClient.GetFollowing(ctx, "", u, count, "")
	if err != nil {
		return nil, fmt.Errorf("bird-cli error: %w", err)
	}

	// 3. 存入数据库
	now := time.Now()
	dbRecords := make([]data.TwitterFollowing, 0, len(accounts))
	for _, acc := range accounts {
		dbRecords = append(dbRecords, data.TwitterFollowing{
			UserID:         userID,
			PlatformUserID: acc.PlatformUserID,
			Username:       acc.Username,
			DisplayName:    acc.DisplayName,
			AvatarURL:      acc.AvatarURL,
			Bio:            acc.Bio,
			FollowerCount:  acc.FollowerCount,
			FollowingCount: acc.FollowingCount,
			IsBlueVerified: acc.IsBlueVerified,
			FetchedAt:      now,
		})
	}

	if err := uc.followingRepo.BulkUpsert(ctx, userID, dbRecords); err != nil {
		fmt.Printf("[WARN] Failed to save following to database: %v\n", err)
	}

	return accounts, nil
}

// GetMonitoredAccounts 获取用户的监控账号列表
func (uc *SocialUsecase) GetMonitoredAccounts(ctx context.Context, userIDHex string) ([]data.MonitoredAccount, error) {
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return nil, err
	}
	return uc.monitoredAccountRepo.FindByUserID(ctx, userID)
}

// AddMonitoredAccount 添加监控账号
func (uc *SocialUsecase) AddMonitoredAccount(ctx context.Context, userIDHex string, account *data.MonitoredAccount) error {
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return err
	}
	account.UserID = userID
	account.Platform = "twitter"
	account.Enabled = true
	return uc.monitoredAccountRepo.Upsert(ctx, account)
}

// RemoveMonitoredAccount 移除监控账号
func (uc *SocialUsecase) RemoveMonitoredAccount(ctx context.Context, userIDHex string, username string) error {
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return err
	}
	return uc.monitoredAccountRepo.DeleteByUserAndUsername(ctx, userID, "twitter", username)
}

// CheckMonitoredStatus 批量检查账号是否已被监控
func (uc *SocialUsecase) CheckMonitoredStatus(ctx context.Context, userIDHex string, usernames []string) (map[string]bool, error) {
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return nil, err
	}
	return uc.monitoredAccountRepo.CheckUsernames(ctx, userID, "twitter", usernames)
}

// parseUserID 解析用户ID（如果不是有效的 ObjectID，使用基于字符串生成的固定 ObjectID）
func parseUserID(userIDHex string) (primitive.ObjectID, error) {
	if parsedID, err := primitive.ObjectIDFromHex(userIDHex); err == nil {
		return parsedID, nil
	}
	// 使用 userIDHex 的 MD5 哈希生成固定的 ObjectID
	hash := md5.Sum([]byte(userIDHex))
	fixedID, _ := primitive.ObjectIDFromHex(hex.EncodeToString(hash[:12]))
	if fixedID.IsZero() {
		fixedID = primitive.NewObjectID()
	}
	return fixedID, nil
}

// GetTweetsForMonitoredAccounts 获取监控账号的推文（从监控账号表补充头像和蓝V）
func (uc *SocialUsecase) GetTweetsForMonitoredAccounts(ctx context.Context, userIDHex string, limit int) ([]data.Tweet, error) {
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return nil, err
	}

	// 1. 获取用户的监控账号列表
	monitoredAccounts, err := uc.monitoredAccountRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get monitored accounts: %w", err)
	}

	if len(monitoredAccounts) == 0 {
		return []data.Tweet{}, nil
	}

	// 2. 提取监控账号的用户名，并建立用户名到账号信息的映射
	authors := make([]string, 0, len(monitoredAccounts))
	accountMap := make(map[string]*data.MonitoredAccount)
	for i := range monitoredAccounts {
		acc := &monitoredAccounts[i]
		authors = append(authors, acc.Username)
		accountMap[acc.Username] = acc
	}

	// 3. 查询这些作者的推文
	if limit <= 0 {
		limit = 50
	}
	tweets, err := uc.tweetRepo.FindByUserAndAuthors(ctx, userID, authors, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get tweets: %w", err)
	}

	// 4. 从监控账号信息中补充头像和蓝V
	for i := range tweets {
		if acc, ok := accountMap[tweets[i].AuthorUsername]; ok {
			tweets[i].AuthorAvatarURL = acc.AvatarURL
			tweets[i].AuthorIsBlueVerified = acc.IsBlueVerified
		}
	}

	return tweets, nil
}

// GetTweetComments 获取推文的前 N 条评论。库中无数据时，若已启用 bird-cli 则实时拉取并尽量写入库（便于下次秒开）。
func (uc *SocialUsecase) GetTweetComments(ctx context.Context, userIDHex, platformPostID string, limit int) ([]data.TweetComment, error) {
	if limit <= 0 {
		limit = 10
	}

	comments, err := uc.tweetCommentRepo.FindByPlatformPostID(ctx, platformPostID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments: %w", err)
	}
	if len(comments) > 0 {
		return comments, nil
	}

	if !useBirdCLI() || !bird.IsAvailable() {
		return comments, nil
	}

	birdComments, err := uc.birdClient.GetTweetComments(ctx, platformPostID, limit)
	if err != nil {
		return nil, fmt.Errorf("bird replies: %w", err)
	}
	if len(birdComments) == 0 {
		return comments, nil
	}

	var tweet *data.Tweet
	if strings.TrimSpace(userIDHex) != "" {
		if uid, perr := parseUserID(userIDHex); perr == nil {
			tweet, _ = uc.tweetRepo.FindByPlatformPostID(ctx, uid, platformPostID)
		}
	}
	if tweet == nil {
		tweet, _ = uc.tweetRepo.FindFirstByPlatformPostID(ctx, platformPostID)
	}

	var tweetID primitive.ObjectID
	if tweet != nil {
		tweetID = tweet.ID
	}

	out := bird.ConvertToDataComments(birdComments, tweetID, platformPostID)

	if !tweetID.IsZero() && len(out) > 0 {
		if err := uc.tweetCommentRepo.BulkUpsert(ctx, out); err != nil {
			fmt.Printf("[WARN] GetTweetComments save replies: %v\n", err)
		} else {
			saved, err := uc.tweetCommentRepo.FindByPlatformPostID(ctx, platformPostID, limit)
			if err == nil && len(saved) > 0 {
				return saved, nil
			}
		}
	}

	for i := range out {
		if out[i].ID.IsZero() {
			out[i].ID = primitive.NewObjectID()
		}
	}
	return out, nil
}

// FetchAndSaveTweetsForAccount 获取并保存指定账号的推文（同时获取评论）
func (uc *SocialUsecase) FetchAndSaveTweetsForAccount(ctx context.Context, userIDHex string, username string, count int) ([]data.Tweet, error) {
	if !useBirdCLI() {
		return nil, fmt.Errorf("请设置 TWITTER_USE_BIRD=true")
	}
	if !bird.IsAvailable() {
		return nil, fmt.Errorf("未检测到 bird 命令")
	}

	userID, err := parseUserID(userIDHex)
	if err != nil {
		return nil, err
	}

	// 获取账号信息以填充作者信息
	monitoredAcc, _ := uc.monitoredAccountRepo.FindByUserAndUsername(ctx, userID, "twitter", username)

	// 使用 bird-cli 获取推文
	birdTweets, err := uc.birdClient.GetUserTweets(ctx, username, count)
	if err != nil {
		return nil, fmt.Errorf("bird-cli error: %w", err)
	}

	// 转换为 data.Tweet 并保存
	now := time.Now()
	tweets := make([]data.Tweet, 0, len(birdTweets))
	for _, bt := range birdTweets {
		publishedAt, _ := time.Parse(time.RubyDate, bt.CreatedAt)
		if publishedAt.IsZero() {
			publishedAt, _ = time.Parse("Mon Jan 02 15:04:05 +0000 2006", bt.CreatedAt)
		}

		authorName := bt.Author.Name
		authorUsername := bt.Author.Username
		authorAvatarURL := ""
		if monitoredAcc != nil {
			authorName = monitoredAcc.DisplayName
			authorAvatarURL = monitoredAcc.AvatarURL
			fmt.Printf("[biz] Using avatar from monitoredAcc: %s\n", authorAvatarURL)
		} else {
			fmt.Printf("[biz] No monitoredAcc found for %s\n", authorUsername)
		}

		tweet := data.Tweet{
			UserID:               userID,
			Platform:             "twitter",
			PlatformPostID:       bt.ID,
			AuthorUsername:       authorUsername,
			AuthorDisplayName:    authorName,
			AuthorAvatarURL:      authorAvatarURL,
			AuthorIsBlueVerified: bt.Author.IsBlueVerified,
			Content:              bt.Text,
			PostURL:              fmt.Sprintf("https://x.com/%s/status/%s", authorUsername, bt.ID),
			PublishedAt:          publishedAt,
			LikeCount:            int64(bt.LikeCount),
			RepostCount:          int64(bt.RetweetCount),
			ReplyCount:           int64(bt.ReplyCount),
			FetchedAt:            now,
		}

		// 提取媒体URL
		if len(bt.Media) > 0 {
			mediaURLs := make([]string, 0, len(bt.Media))
			for _, m := range bt.Media {
				mediaURLs = append(mediaURLs, m.URL)
			}
			tweet.MediaURLs = mediaURLs
		}

		tweets = append(tweets, tweet)
	}

	// 批量保存推文
	if err := uc.tweetRepo.BulkUpsert(ctx, tweets); err != nil {
		fmt.Printf("[WARN] Failed to save tweets: %v\n", err)
	}

	// 获取并保存每条推文的评论（Top 10）
	for i := range tweets {
		if tweets[i].ReplyCount > 0 {
			fmt.Printf("[biz] Fetching comments for tweet %s (reply_count=%d)\n", tweets[i].PlatformPostID, tweets[i].ReplyCount)
			// 获取评论
			birdComments, err := uc.birdClient.GetTweetComments(ctx, tweets[i].PlatformPostID, 10)
			if err != nil {
				fmt.Printf("[WARN] Failed to get comments for tweet %s: %v\n", tweets[i].PlatformPostID, err)
				continue
			}

			fmt.Printf("[biz] Got %d comments for tweet %s\n", len(birdComments), tweets[i].PlatformPostID)

			if len(birdComments) > 0 {
				// 需要先从数据库获取推文ID（因为 Upsert 后 tweets[i].ID 可能为空）
				savedTweet, err := uc.tweetRepo.FindByPlatformPostID(ctx, userID, tweets[i].PlatformPostID)
				if err != nil || savedTweet == nil {
					fmt.Printf("[WARN] Could not find saved tweet %s: %v\n", tweets[i].PlatformPostID, err)
					continue
				}

				// 转换并保存评论
				comments := bird.ConvertToDataComments(birdComments, savedTweet.ID, tweets[i].PlatformPostID)
				fmt.Printf("[biz] Saving %d comments for tweet %s\n", len(comments), tweets[i].PlatformPostID)
				if err := uc.tweetCommentRepo.BulkUpsert(ctx, comments); err != nil {
					fmt.Printf("[WARN] Failed to save comments for tweet %s: %v\n", tweets[i].PlatformPostID, err)
				} else {
					fmt.Printf("[INFO] Saved %d comments for tweet %s\n", len(comments), tweets[i].PlatformPostID)
				}
			}
		}
	}

	return tweets, nil
}

// RefreshTweetsForMonitoredAccounts 刷新所有监控账号的推文
func (uc *SocialUsecase) RefreshTweetsForMonitoredAccounts(ctx context.Context, userIDHex string) error {
	fmt.Printf("[biz] RefreshTweetsForMonitoredAccounts started for user: %s\n", userIDHex)
	
	userID, err := parseUserID(userIDHex)
	if err != nil {
		return err
	}

	// 获取监控账号列表
	accounts, err := uc.monitoredAccountRepo.FindByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get monitored accounts: %w", err)
	}
	
	fmt.Printf("[biz] Found %d monitored accounts\n", len(accounts))

	// 逐个获取推文
	for _, acc := range accounts {
		fmt.Printf("[biz] Fetching tweets for %s...\n", acc.Username)
		_, err := uc.FetchAndSaveTweetsForAccount(ctx, userIDHex, acc.Username, 20)
		if err != nil {
			fmt.Printf("[WARN] Failed to fetch tweets for %s: %v\n", acc.Username, err)
		}
	}

	return nil
}
