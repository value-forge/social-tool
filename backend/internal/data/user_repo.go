package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// User 系统用户
type User struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	Email         string             `bson:"email"`
	Name          string             `bson:"name"`
	Settings      UserSettings       `bson:"settings"`
	Notifications UserNotifications  `bson:"notifications"`
	CT            time.Time          `bson:"ct"`
	UT            time.Time          `bson:"ut"`
}

type UserSettings struct {
	DingTalkWebhook string `bson:"dingtalkWebhook"`
}

type UserNotifications struct {
	DingTalk bool `bson:"dingtalk"`
}

type UserRepo struct {
	coll *mongo.Collection
}

func NewUserRepo(db *mongo.Database) *UserRepo {
	return &UserRepo{coll: db.Collection("users")}
}

func (r *UserRepo) Create(ctx context.Context, user *User) error {
	now := time.Now()
	user.CT = now
	user.UT = now
	result, err := r.coll.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		user.ID = oid
	}
	return nil
}

func (r *UserRepo) GetFirstUser(ctx context.Context) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepo) InitIndexes(ctx context.Context) error {
	_, err := r.coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return err
}
