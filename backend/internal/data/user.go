package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AuthProvider struct {
	Provider       string    `bson:"provider"`
	ProviderUserID string    `bson:"provider_user_id"`
	ProviderEmail  string    `bson:"provider_email,omitempty"`
	LinkedAt       time.Time `bson:"linked_at"`
}

type User struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	TwitterID       string             `bson:"twitter_id"`
	TwitterUsername string             `bson:"twitter_username"`
	Email           string             `bson:"email,omitempty"`
	PasswordHash    string             `bson:"password_hash,omitempty"`
	DisplayName     string             `bson:"display_name"`
	AvatarURL       string             `bson:"avatar_url"`
	AuthProviders   []AuthProvider     `bson:"auth_providers"`
	DefaultLLMModel string             `bson:"default_llm_model,omitempty"`
	CreatedAt       time.Time          `bson:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"`
}

type UserRepo struct {
	coll *mongo.Collection
}

func NewUserRepo(data *Data) *UserRepo {
	coll := data.MongoDB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "twitter_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	})
	return &UserRepo{coll: coll}
}

func (r *UserRepo) FindByTwitterID(ctx context.Context, twitterID string) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{"twitter_id": twitterID}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepo) FindByID(ctx context.Context, id primitive.ObjectID) (*User, error) {
	var user User
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepo) Create(ctx context.Context, user *User) error {
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	result, err := r.coll.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *UserRepo) Update(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": user.ID}, user)
	return err
}
