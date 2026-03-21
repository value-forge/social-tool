package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Tweet 推文模型
type Tweet struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"`
	UserID            primitive.ObjectID `bson:"user_id"`              // 本地用户ID
	Platform          string             `bson:"platform"`             // 平台类型，如 twitter
	PlatformPostID    string             `bson:"platform_post_id"`     // 平台推文ID
	AuthorUsername    string             `bson:"author_username"`      // 作者用户名
	AuthorDisplayName string             `bson:"author_display_name"`  // 作者显示名称
	AuthorAvatarURL   string             `bson:"author_avatar_url"`    // 作者头像
	AuthorIsBlueVerified bool          `bson:"author_is_blue_verified"` // 作者是否蓝V认证
	Content           string             `bson:"content"`              // 推文内容
	MediaURLs         []string           `bson:"media_urls"`           // 媒体URL列表
	PostURL           string             `bson:"post_url"`             // 推文链接
	PublishedAt       time.Time          `bson:"published_at"`         // 发布时间
	LikeCount         int64              `bson:"like_count"`           // 点赞数
	RepostCount       int64              `bson:"repost_count"`         // 转发数
	ReplyCount        int64              `bson:"reply_count"`          // 回复数
	ViewCount         int64              `bson:"view_count"`           // 浏览数
	IsReply           bool               `bson:"is_reply"`             // 是否是回复
	ReplyToUsername   string             `bson:"reply_to_username"`    // 回复给哪个用户
	IsQuote           bool               `bson:"is_quote"`             // 是否是引用推文
	QuotedTweetID     string             `bson:"quoted_tweet_id"`      // 引用的推文ID
	Language          string             `bson:"language"`             // 语言
	FetchedAt         time.Time          `bson:"fetched_at"`           // 数据获取时间
	CreatedAt         time.Time          `bson:"created_at"`
	UpdatedAt         time.Time          `bson:"updated_at"`
}

// TweetComment 推文评论模型
type TweetComment struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"`
	TweetID           primitive.ObjectID `bson:"tweet_id"`             // 关联的推文ID
	PlatformCommentID string             `bson:"platform_comment_id"`  // 平台评论ID
	PlatformPostID    string             `bson:"platform_post_id"`     // 平台推文ID（用于查询）
	AuthorUsername    string             `bson:"author_username"`      // 评论者用户名
	AuthorDisplayName string             `bson:"author_display_name"`  // 评论者显示名称
	AuthorAvatarURL   string             `bson:"author_avatar_url"`    // 评论者头像
	AuthorIsBlueVerified bool          `bson:"author_is_blue_verified"` // 评论者是否蓝V认证
	Content           string             `bson:"content"`              // 评论内容
	LikeCount         int64              `bson:"like_count"`           // 点赞数
	PublishedAt       time.Time          `bson:"published_at"`         // 发布时间
	IsReply           bool               `bson:"is_reply"`             // 是否是回复评论
	ReplyToUsername   string             `bson:"reply_to_username"`    // 回复给哪个用户
	FetchedAt         time.Time          `bson:"fetched_at"`           // 数据获取时间
	CreatedAt         time.Time          `bson:"created_at"`
	UpdatedAt         time.Time          `bson:"updated_at"`
}

// TweetRepo 推文仓库
type TweetRepo struct {
	coll *mongo.Collection
}

// NewTweetRepo 创建推文仓库
func NewTweetRepo(data *Data) *TweetRepo {
	coll := data.MongoDB.Collection("tweets")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 创建复合索引：用户ID + 平台 + 平台推文ID（唯一）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "platform", Value: 1}, {Key: "platform_post_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// 创建索引：作者用户名（用于查询特定用户的推文）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "author_username", Value: 1}, {Key: "published_at", Value: -1}},
	})

	// 创建索引：发布时间（用于按时间排序）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "published_at", Value: -1}},
	})

	return &TweetRepo{coll: coll}
}

// FindByUserID 查询某用户的所有推文
func (r *TweetRepo) FindByUserID(ctx context.Context, userID primitive.ObjectID, limit int) ([]Tweet, error) {
	opts := options.Find().SetSort(bson.D{{Key: "published_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := r.coll.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tweets []Tweet
	if err := cursor.All(ctx, &tweets); err != nil {
		return nil, err
	}
	return tweets, nil
}

// FindByUserAndAuthors 查询某用户监控的指定作者的推文
func (r *TweetRepo) FindByUserAndAuthors(ctx context.Context, userID primitive.ObjectID, authors []string, limit int) ([]Tweet, error) {
	filter := bson.M{
		"user_id":          userID,
		"author_username":  bson.M{"$in": authors},
	}
	opts := options.Find().SetSort(bson.D{{Key: "published_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tweets []Tweet
	if err := cursor.All(ctx, &tweets); err != nil {
		return nil, err
	}
	return tweets, nil
}

// FindByPlatformPostID 根据平台推文ID查询
func (r *TweetRepo) FindByPlatformPostID(ctx context.Context, userID primitive.ObjectID, platformPostID string) (*Tweet, error) {
	var tweet Tweet
	err := r.coll.FindOne(ctx, bson.M{
		"user_id":          userID,
		"platform_post_id": platformPostID,
	}).Decode(&tweet)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &tweet, nil
}

// FindFirstByPlatformPostID 不按 user_id 过滤，取任意一条（单租户/评论回填用）
func (r *TweetRepo) FindFirstByPlatformPostID(ctx context.Context, platformPostID string) (*Tweet, error) {
	var tweet Tweet
	opts := options.FindOne().SetSort(bson.D{{Key: "fetched_at", Value: -1}})
	err := r.coll.FindOne(ctx, bson.M{"platform_post_id": platformPostID}, opts).Decode(&tweet)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &tweet, nil
}

// Upsert 插入或更新推文
func (r *TweetRepo) Upsert(ctx context.Context, tweet *Tweet) error {
	tweet.UpdatedAt = time.Now()
	if tweet.CreatedAt.IsZero() {
		tweet.CreatedAt = time.Now()
	}

	filter := bson.M{
		"user_id":          tweet.UserID,
		"platform":         tweet.Platform,
		"platform_post_id": tweet.PlatformPostID,
	}
	update := bson.M{"$set": tweet}
	opts := options.Update().SetUpsert(true)

	result, err := r.coll.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}
	if result.UpsertedID != nil {
		tweet.ID = result.UpsertedID.(primitive.ObjectID)
	}
	return nil
}

// BulkUpsert 批量插入或更新推文
func (r *TweetRepo) BulkUpsert(ctx context.Context, tweets []Tweet) error {
	if len(tweets) == 0 {
		return nil
	}

	models := make([]mongo.WriteModel, 0, len(tweets))
	for _, t := range tweets {
		t.UpdatedAt = time.Now()
		if t.CreatedAt.IsZero() {
			t.CreatedAt = time.Now()
		}

		filter := bson.M{
			"user_id":          t.UserID,
			"platform":         t.Platform,
			"platform_post_id": t.PlatformPostID,
		}
		update := bson.M{"$set": t}
		models = append(models, mongo.NewUpdateOneModel().
			SetFilter(filter).
			SetUpdate(update).
			SetUpsert(true))
	}

	_, err := r.coll.BulkWrite(ctx, models)
	return err
}

// CountByUserID 查询某用户的推文数量
func (r *TweetRepo) CountByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{"user_id": userID})
}

// CountByUserAndAuthors 查询指定作者的推文数量
func (r *TweetRepo) CountByUserAndAuthors(ctx context.Context, userID primitive.ObjectID, authors []string) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{
		"user_id":         userID,
		"author_username": bson.M{"$in": authors},
	})
}

// TweetCommentRepo 推文评论仓库
type TweetCommentRepo struct {
	coll *mongo.Collection
}

// NewTweetCommentRepo 创建评论仓库
func NewTweetCommentRepo(data *Data) *TweetCommentRepo {
	coll := data.MongoDB.Collection("tweet_comments")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 创建复合索引：推文ID + 平台评论ID（唯一）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "tweet_id", Value: 1}, {Key: "platform_comment_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// 创建索引：平台推文ID（用于查询某推文的所有评论）
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "platform_post_id", Value: 1}, {Key: "published_at", Value: -1}},
	})

	return &TweetCommentRepo{coll: coll}
}

// FindByTweetID 查询某推文的所有评论
func (r *TweetCommentRepo) FindByTweetID(ctx context.Context, tweetID primitive.ObjectID, limit int) ([]TweetComment, error) {
	opts := options.Find().SetSort(bson.D{{Key: "like_count", Value: -1}}) // 按点赞数排序
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := r.coll.Find(ctx, bson.M{"tweet_id": tweetID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []TweetComment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, err
	}
	return comments, nil
}

// FindByPlatformPostID 根据平台推文ID查询评论
func (r *TweetCommentRepo) FindByPlatformPostID(ctx context.Context, platformPostID string, limit int) ([]TweetComment, error) {
	opts := options.Find().SetSort(bson.D{{Key: "like_count", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := r.coll.Find(ctx, bson.M{"platform_post_id": platformPostID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []TweetComment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, err
	}
	return comments, nil
}

// Upsert 插入或更新评论
func (r *TweetCommentRepo) Upsert(ctx context.Context, comment *TweetComment) error {
	comment.UpdatedAt = time.Now()
	if comment.CreatedAt.IsZero() {
		comment.CreatedAt = time.Now()
	}

	filter := bson.M{
		"tweet_id":           comment.TweetID,
		"platform_comment_id": comment.PlatformCommentID,
	}
	update := bson.M{"$set": comment}
	opts := options.Update().SetUpsert(true)

	result, err := r.coll.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}
	if result.UpsertedID != nil {
		comment.ID = result.UpsertedID.(primitive.ObjectID)
	}
	return nil
}

// BulkUpsert 批量插入或更新评论
func (r *TweetCommentRepo) BulkUpsert(ctx context.Context, comments []TweetComment) error {
	if len(comments) == 0 {
		return nil
	}

	models := make([]mongo.WriteModel, 0, len(comments))
	for _, c := range comments {
		c.UpdatedAt = time.Now()
		if c.CreatedAt.IsZero() {
			c.CreatedAt = time.Now()
		}

		filter := bson.M{
			"tweet_id":            c.TweetID,
			"platform_comment_id": c.PlatformCommentID,
		}
		update := bson.M{"$set": c}
		models = append(models, mongo.NewUpdateOneModel().
			SetFilter(filter).
			SetUpdate(update).
			SetUpsert(true))
	}

	_, err := r.coll.BulkWrite(ctx, models)
	return err
}

// CountByTweetID 查询某推文的评论数量
func (r *TweetCommentRepo) CountByTweetID(ctx context.Context, tweetID primitive.ObjectID) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{"tweet_id": tweetID})
}
