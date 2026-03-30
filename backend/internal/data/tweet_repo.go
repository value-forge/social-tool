package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Tweet 推文
type Tweet struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	TwitterUserID primitive.ObjectID `bson:"twitterUserId"`
	TweetID       string             `bson:"tweetId"`
	URL           string             `bson:"url"`
	Text          string             `bson:"text"`
	TwitterID     string             `bson:"twitterId"`
	Media         []Media            `bson:"media,omitempty"`
	Metrics       Metrics            `bson:"metrics"`
	Type          string             `bson:"type"` // original, reply, retweet, quote
	PublishedAt   time.Time          `bson:"publishedAt"`
	FetchedAt     time.Time          `bson:"fetchedAt"`
	AIStatus      int                `bson:"aiStatus"` // -1: 未完成ai分析, 1: 完成ai分析
	AIAnalyzedAt  *time.Time         `bson:"aiAnalyzedAt,omitempty"`
	AISuggestions *AISuggestions     `bson:"aiSuggestions,omitempty"`
	CT            time.Time          `bson:"ct"`
	UT            time.Time          `bson:"ut"`
}

type Media struct {
	Type string `bson:"type"` // photo, video, gif
	URL  string `bson:"url"`
}

type Metrics struct {
	RetweetCount int `bson:"retweetCount"`
	ReplyCount   int `bson:"replyCount"`
	LikeCount    int `bson:"likeCount"`
	ViewCount    int `bson:"viewCount"`
}

type AISuggestions struct {
	Score      float64    `bson:"score"`
	Summary    string     `bson:"summary"`
	Suggestion Suggestion `bson:"suggestion"`
}

type Suggestion struct {
	Type    string `bson:"type"`
	Content string `bson:"content"`
	Reason  string `bson:"reason"`
}

type TweetRepo struct {
	coll *mongo.Collection
}

func NewTweetRepo(db *mongo.Database) *TweetRepo {
	return &TweetRepo{coll: db.Collection("tweets")}
}

func (r *TweetRepo) GetByTweetID(ctx context.Context, tweetID string) (*Tweet, error) {
	var tweet Tweet
	err := r.coll.FindOne(ctx, bson.M{"tweetId": tweetID}).Decode(&tweet)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &tweet, err
}

func (r *TweetRepo) Create(ctx context.Context, tweet *Tweet) error {
	now := time.Now()
	tweet.CT = now
	tweet.UT = now
	if tweet.AIStatus == 0 {
		tweet.AIStatus = -1 // -1: 未完成ai分析
	}
	_, err := r.coll.InsertOne(ctx, tweet)
	return err
}

func (r *TweetRepo) UpdateMetrics(ctx context.Context, tweetID string, metrics Metrics) error {
	_, err := r.coll.UpdateOne(ctx,
		bson.M{"tweetId": tweetID},
		bson.M{"$set": bson.M{"metrics": metrics, "ut": time.Now()}})
	return err
}

func (r *TweetRepo) UpdateAIResult(ctx context.Context, tweetID string, suggestions *AISuggestions) error {
	now := time.Now()
	_, err := r.coll.UpdateOne(ctx,
		bson.M{"tweetId": tweetID},
		bson.M{"$set": bson.M{
			"aiSuggestions": suggestions,
			"aiStatus":      1, // 1: 完成ai分析
			"aiAnalyzedAt":  now,
			"ut":            now,
		}})
	return err
}

// ListPending 获取未完成AI分析的推文
func (r *TweetRepo) ListPending(ctx context.Context) ([]*Tweet, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"aiStatus": -1}) // -1: 未完成ai分析
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tweets []*Tweet
	if err := cursor.All(ctx, &tweets); err != nil {
		return nil, err
	}
	return tweets, nil
}

// ListByAIStatus 根据AI状态查询推文
func (r *TweetRepo) ListByAIStatus(ctx context.Context, status int, limit int) ([]*Tweet, error) {
	opts := options.Find().SetSort(bson.D{{Key: "publishedAt", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := r.coll.Find(ctx, bson.M{"aiStatus": status}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tweets []*Tweet
	if err := cursor.All(ctx, &tweets); err != nil {
		return nil, err
	}
	return tweets, nil
}

func (r *TweetRepo) InitIndexes(ctx context.Context) error {
	_, err := r.coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "tweetId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "twitterUserId", Value: 1}, {Key: "publishedAt", Value: -1}}},
		{Keys: bson.D{{Key: "publishedAt", Value: -1}}},
		{Keys: bson.D{{Key: "aiStatus", Value: 1}, {Key: "publishedAt", Value: -1}}},
	})
	return err
}
