package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// TwitterUser Twitter用户
type TwitterUser struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	TwitterID     string             `bson:"twitterId"`
	Username      string             `bson:"username"`
	Profile       Profile            `bson:"profile"`
	Stats         UserStats          `bson:"stats"`
	RefCount      int                `bson:"refCount"`
	MonitorStatus int                `bson:"monitorStatus"` // 1: 正常监控, -1: 不在监控
	LastFetchedAt *time.Time         `bson:"lastFetchedAt,omitempty"`
	CT            time.Time          `bson:"ct"`
	UT            time.Time          `bson:"ut"`
}

type Profile struct {
	DisplayName string `bson:"displayName"`
	Avatar      string `bson:"avatar"`
	Bio         string `bson:"bio"`
	Verified    bool   `bson:"verified"`
	Location    string `bson:"location"`
	Website     string `bson:"website"`
}

type UserStats struct {
	FollowersCount int       `bson:"followersCount"`
	FollowingCount int       `bson:"followingCount"`
	TweetsCount    int       `bson:"tweetsCount"`
	UpdatedAt      time.Time `bson:"updatedAt"`
}

type TwitterUserRepo struct {
	coll *mongo.Collection
}

func NewTwitterUserRepo(db *mongo.Database) *TwitterUserRepo {
	return &TwitterUserRepo{coll: db.Collection("twitter_users")}
}

func (r *TwitterUserRepo) GetByUsername(ctx context.Context, username string) (*TwitterUser, error) {
	var user TwitterUser
	err := r.coll.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *TwitterUserRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*TwitterUser, error) {
	var user TwitterUser
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *TwitterUserRepo) CreateOrUpdate(ctx context.Context, user *TwitterUser) (*primitive.ObjectID, error) {
	now := time.Now()
	user.UT = now

	setData := bson.M{
		"twitterId": user.TwitterID,
		"username":  user.Username,
		"profile":   user.Profile,
		"stats":     user.Stats,
		"ut":        now,
	}
	if user.RefCount != 0 {
		setData["refCount"] = user.RefCount
	}
	if user.MonitorStatus != 0 {
		setData["monitorStatus"] = user.MonitorStatus
	}
	if user.LastFetchedAt != nil {
		setData["lastFetchedAt"] = *user.LastFetchedAt
	}

	result, err := r.coll.UpdateOne(ctx,
		bson.M{"twitterId": user.TwitterID},
		bson.M{
			"$set":         setData,
			"$setOnInsert": bson.M{"ct": now},
		},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		return nil, err
	}

	if result.UpsertedID != nil {
		id := result.UpsertedID.(primitive.ObjectID)
		return &id, nil
	}

	var existing TwitterUser
	if err := r.coll.FindOne(ctx, bson.M{"twitterId": user.TwitterID}).Decode(&existing); err != nil {
		return nil, err
	}
	return &existing.ID, nil
}

// UpdateRefCount 更新引用计数
func (r *TwitterUserRepo) UpdateRefCount(ctx context.Context, twitterID string, delta int) error {
	_, err := r.coll.UpdateOne(ctx,
		bson.M{"twitterId": twitterID},
		bson.M{"$inc": bson.M{"refCount": delta}})
	return err
}

// UpdateMonitorStatus 更新监控状态
func (r *TwitterUserRepo) UpdateMonitorStatus(ctx context.Context, twitterID string, status int) error {
	_, err := r.coll.UpdateOne(ctx,
		bson.M{"twitterId": twitterID},
		bson.M{"$set": bson.M{"monitorStatus": status, "ut": time.Now()}})
	return err
}

// ListActive 获取所有正在监控的用户
func (r *TwitterUserRepo) ListActive(ctx context.Context) ([]*TwitterUser, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"monitorStatus": 1})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*TwitterUser
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

// ListByRefCount 根据引用计数和监控状态查询
func (r *TwitterUserRepo) ListByRefCount(ctx context.Context, minRefCount int) ([]*TwitterUser, error) {
	cursor, err := r.coll.Find(ctx, bson.M{
		"refCount":      bson.M{"$gte": minRefCount},
		"monitorStatus": 1,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*TwitterUser
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (r *TwitterUserRepo) InitIndexes(ctx context.Context) error {
	_, err := r.coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "twitterId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "username", Value: 1}}},
		{Keys: bson.D{{Key: "refCount", Value: 1}, {Key: "monitorStatus", Value: 1}}},
		{Keys: bson.D{{Key: "lastFetchedAt", Value: 1}}},
	})
	return err
}
