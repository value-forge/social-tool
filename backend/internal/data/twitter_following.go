package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// TwitterFollowing 存储用户的关注列表
type TwitterFollowing struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	UserID          primitive.ObjectID `bson:"user_id"`          // 本地用户ID
	PlatformUserID  string             `bson:"platform_user_id"` // Twitter 用户ID
	Username        string             `bson:"username"`
	DisplayName     string             `bson:"display_name"`
	AvatarURL       string             `bson:"avatar_url"`
	Bio             string             `bson:"bio"`
	FollowerCount   int64              `bson:"follower_count"`
	FollowingCount  int64              `bson:"following_count"`
	IsBlueVerified  bool               `bson:"is_blue_verified"`
	FetchedAt       time.Time          `bson:"fetched_at"`
	CreatedAt       time.Time          `bson:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"`
}

// TwitterFollowingRepo 关注列表存储
type TwitterFollowingRepo struct {
	coll *mongo.Collection
}

// NewTwitterFollowingRepo 创建仓库
func NewTwitterFollowingRepo(data *Data) *TwitterFollowingRepo {
	coll := data.MongoDB.Collection("twitter_following")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// 创建复合索引：用户ID + Twitter用户ID
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "platform_user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	
	// 创建索引：用户ID（用于查询某用户的所有关注）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})
	
	return &TwitterFollowingRepo{coll: coll}
}

// FindByUserID 查询某用户的所有关注列表
func (r *TwitterFollowingRepo) FindByUserID(ctx context.Context, userID primitive.ObjectID) ([]TwitterFollowing, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var following []TwitterFollowing
	if err := cursor.All(ctx, &following); err != nil {
		return nil, err
	}
	return following, nil
}

// FindLatestByUserID 查询某用户最近获取的关注列表（带时间戳）
func (r *TwitterFollowingRepo) FindLatestByUserID(ctx context.Context, userID primitive.ObjectID, since time.Time) ([]TwitterFollowing, error) {
	filter := bson.M{
		"user_id":    userID,
		"fetched_at": bson.M{"$gte": since},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	var following []TwitterFollowing
	if err := cursor.All(ctx, &following); err != nil {
		return nil, err
	}
	return following, nil
}

// CountByUserID 查询某用户的关注数量
func (r *TwitterFollowingRepo) CountByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{"user_id": userID})
}

// Upsert 插入或更新关注记录
func (r *TwitterFollowingRepo) Upsert(ctx context.Context, following *TwitterFollowing) error {
	following.UpdatedAt = time.Now()
	if following.CreatedAt.IsZero() {
		following.CreatedAt = time.Now()
	}
	
	filter := bson.M{
		"user_id":          following.UserID,
		"platform_user_id": following.PlatformUserID,
	}
	update := bson.M{"$set": following}
	opts := options.Update().SetUpsert(true)
	
	result, err := r.coll.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}
	if result.UpsertedID != nil {
		following.ID = result.UpsertedID.(primitive.ObjectID)
	}
	return nil
}

// BulkUpsert 批量插入或更新
func (r *TwitterFollowingRepo) BulkUpsert(ctx context.Context, userID primitive.ObjectID, following []TwitterFollowing) error {
	if len(following) == 0 {
		return nil
	}
	
	models := make([]mongo.WriteModel, 0, len(following))
	for _, f := range following {
		f.UserID = userID
		f.UpdatedAt = time.Now()
		if f.CreatedAt.IsZero() {
			f.CreatedAt = time.Now()
		}
		
		filter := bson.M{
			"user_id":          f.UserID,
			"platform_user_id": f.PlatformUserID,
		}
		update := bson.M{"$set": f}
		models = append(models, mongo.NewUpdateOneModel().
			SetFilter(filter).
			SetUpdate(update).
			SetUpsert(true))
	}
	
	_, err := r.coll.BulkWrite(ctx, models)
	return err
}

// DeleteByUserID 删除某用户的所有关注记录（用于刷新）
func (r *TwitterFollowingRepo) DeleteByUserID(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.coll.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// GetLastFetchTime 获取某用户最后一次拉取时间
func (r *TwitterFollowingRepo) GetLastFetchTime(ctx context.Context, userID primitive.ObjectID) (time.Time, error) {
	var result struct {
		FetchedAt time.Time `bson:"fetched_at"`
	}
	
	opts := options.FindOne().SetSort(bson.M{"fetched_at": -1})
	err := r.coll.FindOne(ctx, bson.M{"user_id": userID}, opts).Decode(&result)
	
	if err == mongo.ErrNoDocuments {
		return time.Time{}, nil
	}
	if err != nil {
		return time.Time{}, err
	}
	return result.FetchedAt, nil
}
