package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MonitoredAccount 监控账号模型
type MonitoredAccount struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"`
	UserID         primitive.ObjectID `bson:"user_id"`          // 本地用户ID
	Platform       string             `bson:"platform"`         // 平台类型，如 twitter
	PlatformUserID string             `bson:"platform_user_id"` // 平台用户ID
	Username       string             `bson:"username"`         // 用户名
	DisplayName    string             `bson:"display_name"`     // 显示名称
	AvatarURL      string             `bson:"avatar_url"`       // 头像URL
	Bio            string             `bson:"bio"`              // 简介
	Enabled        bool               `bson:"enabled"`          // 是否启用监控
	FollowerCount  int64              `bson:"follower_count"`   // 粉丝数
	FollowingCount int64              `bson:"following_count"`  // 关注数
	IsBlueVerified bool               `bson:"is_blue_verified"` // 是否蓝V
	CreatedAt      time.Time          `bson:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at"`
}

// MonitoredAccountRepo 监控账号仓库
type MonitoredAccountRepo struct {
	coll *mongo.Collection
}

// NewMonitoredAccountRepo 创建仓库
func NewMonitoredAccountRepo(data *Data) *MonitoredAccountRepo {
	coll := data.MongoDB.Collection("monitored_accounts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 创建复合索引：用户ID + 平台 + 用户名（唯一）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "platform", Value: 1}, {Key: "username", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// 创建索引：用户ID（用于查询某用户的所有监控账号）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "enabled", Value: 1}},
	})

	return &MonitoredAccountRepo{coll: coll}
}

// FindByUserID 查询某用户的所有监控账号
func (r *MonitoredAccountRepo) FindByUserID(ctx context.Context, userID primitive.ObjectID) ([]MonitoredAccount, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var accounts []MonitoredAccount
	if err := cursor.All(ctx, &accounts); err != nil {
		return nil, err
	}
	return accounts, nil
}

// FindByUserAndUsername 查询某用户是否监控了指定账号
func (r *MonitoredAccountRepo) FindByUserAndUsername(ctx context.Context, userID primitive.ObjectID, platform, username string) (*MonitoredAccount, error) {
	var account MonitoredAccount
	err := r.coll.FindOne(ctx, bson.M{
		"user_id":  userID,
		"platform": platform,
		"username": username,
	}).Decode(&account)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// FindByUserAndPlatformUserID 查询某用户是否监控了指定平台用户ID
func (r *MonitoredAccountRepo) FindByUserAndPlatformUserID(ctx context.Context, userID primitive.ObjectID, platform, platformUserID string) (*MonitoredAccount, error) {
	var account MonitoredAccount
	err := r.coll.FindOne(ctx, bson.M{
		"user_id":          userID,
		"platform":         platform,
		"platform_user_id": platformUserID,
	}).Decode(&account)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Upsert 插入或更新监控账号
func (r *MonitoredAccountRepo) Upsert(ctx context.Context, account *MonitoredAccount) error {
	account.UpdatedAt = time.Now()
	if account.CreatedAt.IsZero() {
		account.CreatedAt = time.Now()
	}

	filter := bson.M{
		"user_id":  account.UserID,
		"platform": account.Platform,
		"username": account.Username,
	}
	update := bson.M{"$set": account}
	opts := options.Update().SetUpsert(true)

	result, err := r.coll.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}
	if result.UpsertedID != nil {
		account.ID = result.UpsertedID.(primitive.ObjectID)
	}
	return nil
}

// DeleteByUserAndUsername 删除监控账号
func (r *MonitoredAccountRepo) DeleteByUserAndUsername(ctx context.Context, userID primitive.ObjectID, platform, username string) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{
		"user_id":  userID,
		"platform": platform,
		"username": username,
	})
	return err
}

// CountByUserID 查询某用户的监控账号数量
func (r *MonitoredAccountRepo) CountByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{"user_id": userID, "enabled": true})
}

// CheckUsernames 批量检查用户名是否已被监控
// 返回 map[username]bool
func (r *MonitoredAccountRepo) CheckUsernames(ctx context.Context, userID primitive.ObjectID, platform string, usernames []string) (map[string]bool, error) {
	result := make(map[string]bool)
	for _, u := range usernames {
		result[u] = false
	}

	cursor, err := r.coll.Find(ctx, bson.M{
		"user_id":  userID,
		"platform": platform,
		"username": bson.M{"$in": usernames},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var accounts []MonitoredAccount
	if err := cursor.All(ctx, &accounts); err != nil {
		return nil, err
	}

	for _, acc := range accounts {
		result[acc.Username] = true
	}
	return result, nil
}
