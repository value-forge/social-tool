package main

import (
	"context"
	"social-tool/internal/data"
	"social-tool/pkg/fxtwitter"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.uber.org/zap"
)

// fetchAndCreateTwitterUser 通过 fxtwitter 获取用户信息并写入数据库
func fetchAndCreateTwitterUser(
	ctx context.Context,
	fxClient *fxtwitter.Client,
	twitterRepo *data.TwitterUserRepo,
	username string,
	logger *zap.Logger,
) (*data.TwitterUser, *primitive.ObjectID, error) {
	// 先检查是否已存在且 profile 完整
	existing, err := twitterRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil && existing.Profile.Avatar != "" {
		// 已存在且 profile 完整，跳过
		return existing, &existing.ID, nil
	}

	// 调用 fxtwitter 获取完整 profile
	logger.Info("Fetching user profile from fxtwitter", zap.String("username", username))
	profile, err := fxClient.GetUser(ctx, username)
	if err != nil {
		logger.Warn("fxtwitter fetch failed, using minimal data", zap.String("username", username), zap.Error(err))
		// fallback: 用最少的信息创建
		user := &data.TwitterUser{
			TwitterID:     "",
			Username:      username,
			Profile:       data.Profile{DisplayName: username},
			RefCount:      1,
			MonitorStatus: "active",
		}
		id, err := twitterRepo.CreateOrUpdate(ctx, user)
		if err != nil {
			return nil, nil, err
		}
		return user, id, nil
	}

	// 用 fxtwitter 数据构建完整 TwitterUser
	user := &data.TwitterUser{
		TwitterID: profile.ID,
		Username:  profile.ScreenName,
		Profile: data.Profile{
			DisplayName: profile.Name,
			Avatar:      profile.AvatarURL,
			Bio:         profile.Description,
			Verified:    profile.IsVerified(),
			Location:    profile.Location,
			Website:     profile.GetWebsiteURL(),
		},
		Stats: data.UserStats{
			FollowersCount: profile.Followers,
			FollowingCount: profile.Following,
			TweetsCount:    profile.Tweets,
			UpdatedAt:      time.Now(),
		},
		RefCount:      1,
		MonitorStatus: "active",
	}

	id, err := twitterRepo.CreateOrUpdate(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	logger.Info("Twitter user created from fxtwitter",
		zap.String("username", profile.ScreenName),
		zap.String("twitterId", profile.ID),
		zap.Int("followers", profile.Followers),
		zap.String("location", profile.Location),
	)

	return user, id, nil
}

func initTestData(ctx context.Context, db *data.MongoDB, logger *zap.Logger) error {
	userRepo := data.NewUserRepo(db.DB())
	twitterRepo := data.NewTwitterUserRepo(db.DB())
	monitorRepo := data.NewUserMonitoredAccountRepo(db.DB())
	fxClient := fxtwitter.NewClient()

	// 1. 创建系统用户
	user, err := userRepo.GetFirstUser(ctx)
	if err != nil {
		return err
	}

	if user == nil {
		logger.Info("Creating test user")
		user = &data.User{
			Email: "test@example.com",
			Name:  "Test User",
			Settings: data.UserSettings{
				DingTalkWebhook: "https://oapi.dingtalk.com/robot/send?access_token=3aa3d51d8e0d30f7a6038ea085d90b3e00ae28a11fb0d72ce7d0bd91207f4abc",
			},
			Notifications: data.UserNotifications{DingTalk: true},
		}
		if err := userRepo.Create(ctx, user); err != nil {
			return err
		}
		logger.Info("User created", zap.String("id", user.ID.Hex()))
	}

	// 2. 添加监控用户（通过 fxtwitter 获取完整 profile）
	monitorUsers := []struct {
		username string
		notes    string
	}{
		{"XXY177", "重点关注"},
		{"BTCdayu", ""},
	}

	for _, mu := range monitorUsers {
		_, twitterUserID, err := fetchAndCreateTwitterUser(ctx, fxClient, twitterRepo, mu.username, logger)
		if err != nil {
			logger.Error("Failed to create twitter user", zap.String("username", mu.username), zap.Error(err))
			continue
		}

		// 创建监控关系
		exists, err := monitorRepo.Exists(ctx, user.ID, *twitterUserID)
		if err != nil {
			logger.Error("Failed to check monitor", zap.Error(err))
			continue
		}

		if !exists {
			monitor := &data.UserMonitoredAccount{
				UserID:        user.ID,
				TwitterUserID: *twitterUserID,
				Status:        1,
				Notes:         mu.notes,
			}
			if err := monitorRepo.Create(ctx, monitor); err != nil {
				logger.Error("Failed to create monitor", zap.Error(err))
				continue
			}
			logger.Info("Monitor created", zap.String("username", mu.username))
		}
	}

	return nil
}
