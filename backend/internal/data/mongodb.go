package data

import (
	"context"
	"fmt"
	"social-tool/internal/config"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoDB struct {
	client *mongo.Client
	db     *mongo.Database
}

func NewMongoDB(cfg *config.Config) (*MongoDB, error) {
	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, fmt.Errorf("connect to mongodb failed: %w", err)
	}

	if err := client.Ping(context.Background(), nil); err != nil {
		return nil, fmt.Errorf("ping mongodb failed: %w", err)
	}

	return &MongoDB{
		client: client,
		db:     client.Database(cfg.MongoDB),
	}, nil
}

func (m *MongoDB) DB() *mongo.Database {
	return m.db
}

func (m *MongoDB) Close() error {
	return m.client.Disconnect(context.Background())
}
