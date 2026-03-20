package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PlatformConnection struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty"`
	UserID              primitive.ObjectID `bson:"user_id"`
	Platform            string             `bson:"platform"`
	PlatformUserID      string             `bson:"platform_user_id"`
	PlatformUsername    string             `bson:"platform_username"`
	PlatformDisplayName string             `bson:"platform_display_name"`
	PlatformAvatarURL   string             `bson:"platform_avatar_url"`
	AccessToken         string             `bson:"access_token"`
	RefreshToken        string             `bson:"refresh_token"`
	TokenExpiresAt      time.Time          `bson:"token_expires_at"`
	TokenScopes         []string           `bson:"token_scopes"`
	Status              string             `bson:"status"`
	LastSyncedAt        time.Time          `bson:"last_synced_at,omitempty"`
	ErrorMessage        string             `bson:"error_message,omitempty"`
	AutoConnected       bool               `bson:"auto_connected"`
	ConnectedAt         time.Time          `bson:"connected_at"`
	UpdatedAt           time.Time          `bson:"updated_at"`
}

type PlatformConnectionRepo struct {
	coll *mongo.Collection
}

func NewPlatformConnectionRepo(data *Data) *PlatformConnectionRepo {
	coll := data.MongoDB.Collection("platform_connections")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "platform", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return &PlatformConnectionRepo{coll: coll}
}

func (r *PlatformConnectionRepo) FindByUserAndPlatform(ctx context.Context, userID primitive.ObjectID, platform string) (*PlatformConnection, error) {
	var conn PlatformConnection
	err := r.coll.FindOne(ctx, bson.M{"user_id": userID, "platform": platform}).Decode(&conn)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &conn, err
}

func (r *PlatformConnectionRepo) Upsert(ctx context.Context, conn *PlatformConnection) error {
	conn.UpdatedAt = time.Now()
	if conn.ConnectedAt.IsZero() {
		conn.ConnectedAt = time.Now()
	}

	filter := bson.M{"user_id": conn.UserID, "platform": conn.Platform}
	update := bson.M{"$set": conn}
	opts := options.Update().SetUpsert(true)
	result, err := r.coll.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}
	if result.UpsertedID != nil {
		conn.ID = result.UpsertedID.(primitive.ObjectID)
	}
	return nil
}
