package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserMonitoredAccount 监控关系
type UserMonitoredAccount struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	UserID        primitive.ObjectID `bson:"userId"`
	TwitterUserID primitive.ObjectID `bson:"twitterUserId"`
	Status        int                `bson:"status"` // 1:active
	Notes         string             `bson:"notes"`
	CT            time.Time          `bson:"ct"`
	UT            time.Time          `bson:"ut"`
}

type UserMonitoredAccountRepo struct {
	coll *mongo.Collection
}

func NewUserMonitoredAccountRepo(db *mongo.Database) *UserMonitoredAccountRepo {
	return &UserMonitoredAccountRepo{coll: db.Collection("user_monitored_accounts")}
}

func (r *UserMonitoredAccountRepo) Create(ctx context.Context, account *UserMonitoredAccount) error {
	now := time.Now()
	account.CT = now
	account.UT = now
	_, err := r.coll.InsertOne(ctx, account)
	return err
}

func (r *UserMonitoredAccountRepo) ListActive(ctx context.Context) ([]*UserMonitoredAccount, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"status": 1})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var accounts []*UserMonitoredAccount
	if err := cursor.All(ctx, &accounts); err != nil {
		return nil, err
	}
	return accounts, nil
}

func (r *UserMonitoredAccountRepo) Exists(ctx context.Context, userID, twitterUserID primitive.ObjectID) (bool, error) {
	count, err := r.coll.CountDocuments(ctx, bson.M{
		"userId": userID, "twitterUserId": twitterUserID,
	})
	return count > 0, err
}

func (r *UserMonitoredAccountRepo) InitIndexes(ctx context.Context) error {
	_, err := r.coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "twitterUserId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "status", Value: 1}}},
	})
	return err
}
