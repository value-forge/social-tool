package data

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/social-tool/backend/internal/conf"
)

type Data struct {
	MongoDB *mongo.Database
	Redis   *redis.Client
}

func NewData(c *conf.Data) (*Data, func(), error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(c.MongodbUri))
	if err != nil {
		return nil, nil, fmt.Errorf("connect mongodb: %w", err)
	}
	if err := mongoClient.Ping(ctx, nil); err != nil {
		return nil, nil, fmt.Errorf("ping mongodb: %w", err)
	}

	redisOpts, err := redis.ParseURL(c.RedisUri)
	if err != nil {
		return nil, nil, fmt.Errorf("parse redis uri: %w", err)
	}
	redisClient := redis.NewClient(redisOpts)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		return nil, nil, fmt.Errorf("ping redis: %w", err)
	}

	cleanup := func() {
		_ = mongoClient.Disconnect(context.Background())
		_ = redisClient.Close()
	}

	return &Data{
		MongoDB: mongoClient.Database(c.Database),
		Redis:   redisClient,
	}, cleanup, nil
}
