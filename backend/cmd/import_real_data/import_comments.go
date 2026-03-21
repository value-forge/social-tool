package main

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TweetComment struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"`
	TweetID           primitive.ObjectID `bson:"tweet_id"`
	PlatformCommentID string             `bson:"platform_comment_id"`
	PlatformPostID    string             `bson:"platform_post_id"`
	AuthorUsername    string             `bson:"author_username"`
	AuthorDisplayName string             `bson:"author_display_name"`
	AuthorAvatarURL   string             `bson:"author_avatar_url"`
	Content           string             `bson:"content"`
	LikeCount         int64              `bson:"like_count"`
	PublishedAt       time.Time          `bson:"published_at"`
	IsReply           bool               `bson:"is_reply"`
	ReplyToUsername   string             `bson:"reply_to_username"`
	FetchedAt         time.Time          `bson:"fetched_at"`
	CreatedAt         time.Time          `bson:"created_at"`
	UpdatedAt         time.Time          `bson:"updated_at"`
}

func main() {
	ctx := context.Background()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		panic(err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("social_tool")
	commentsColl := db.Collection("tweet_comments")
	
	// 测试评论数据
	now := time.Now()
	comments := []TweetComment{
		{
			PlatformPostID:    "2032414511903502656",
			PlatformCommentID: "comment_001",
			AuthorUsername:    "crypto_fan",
			AuthorDisplayName: "Crypto Fan",
			AuthorAvatarURL:   "https://pbs.twimg.com/profile_images/1/avatar.jpg",
			Content:           "写得真好，很有启发！",
			LikeCount:         42,
			PublishedAt:       now.Add(-2 * time.Hour),
			IsReply:           false,
			FetchedAt:         now,
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			PlatformPostID:    "2032414511903502656",
			PlatformCommentID: "comment_002",
			AuthorUsername:    "investor_john",
			AuthorDisplayName: "John Investor",
			AuthorAvatarURL:   "https://pbs.twimg.com/profile_images/2/avatar.jpg",
			Content:           "悟道这个词确实被用烂了，但作者分析得很到位",
			LikeCount:         28,
			PublishedAt:       now.Add(-3 * time.Hour),
			IsReply:           false,
			FetchedAt:         now,
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			PlatformPostID:    "2032414511903502656",
			PlatformCommentID: "comment_003",
			AuthorUsername:    "mindful_trader",
			AuthorDisplayName: "Mindful Trader",
			AuthorAvatarURL:   "https://pbs.twimg.com/profile_images/3/avatar.jpg",
			Content:           "从投资角度理解悟道，这是一种长期主义的体现",
			LikeCount:         15,
			PublishedAt:       now.Add(-4 * time.Hour),
			IsReply:           true,
			ReplyToUsername:   "crypto_fan",
			FetchedAt:         now,
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			PlatformPostID:    "2032386395814424982",
			PlatformCommentID: "comment_004",
			AuthorUsername:    "tech_watcher",
			AuthorDisplayName: "Tech Watcher",
			AuthorAvatarURL:   "https://pbs.twimg.com/profile_images/4/avatar.jpg",
			Content:           "美团的 AI 战略确实值得关注",
			LikeCount:         56,
			PublishedAt:       now.Add(-1 * time.Hour),
			IsReply:           false,
			FetchedAt:         now,
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			PlatformPostID:    "2032386395814424982",
			PlatformCommentID: "comment_005",
			AuthorUsername:    "startup_guy",
			AuthorDisplayName: "Startup Guy",
			AuthorAvatarURL:   "https://pbs.twimg.com/profile_images/5/avatar.jpg",
			Content:           "Agent 对商业模式的冲击是全方位的",
			LikeCount:         33,
			PublishedAt:       now.Add(-2 * time.Hour),
			IsReply:           false,
			FetchedAt:         now,
			CreatedAt:         now,
			UpdatedAt:         now,
		},
	}

	for _, c := range comments {
		_, err := commentsColl.UpdateOne(ctx,
			bson.M{"platform_post_id": c.PlatformPostID, "platform_comment_id": c.PlatformCommentID},
			bson.M{"$set": c},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Error inserting comment: %v\n", err)
		}
	}
	
	fmt.Printf("Inserted %d comments\n", len(comments))
}
