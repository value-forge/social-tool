package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Tweet bird-cli 格式
type BirdTweet struct {
	ID             string `json:"id"`
	Text           string `json:"text"`
	CreatedAt      string `json:"createdAt"`
	ReplyCount     int    `json:"replyCount"`
	RetweetCount   int    `json:"retweetCount"`
	LikeCount      int    `json:"likeCount"`
	ConversationID string `json:"conversationId"`
	Author         struct {
		Username string `json:"username"`
		Name     string `json:"name"`
	} `json:"author"`
}

// Following bird-cli 格式
type BirdFollowing struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	FollowersCount  int    `json:"followersCount"`
	FollowingCount  int    `json:"followingCount"`
	ProfileImageURL string `json:"profileImageUrl"`
}

// Post 系统格式
type Post struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"`
	UserID            primitive.ObjectID `bson:"user_id"`
	Platform          string             `bson:"platform"`
	PlatformPostID    string             `bson:"platform_post_id"`
	AuthorUsername    string             `bson:"author_username"`
	AuthorDisplayName string             `bson:"author_display_name"`
	AuthorAvatarURL   string             `bson:"author_avatar_url"`
	Content           string             `bson:"content"`
	PublishedAt       time.Time          `bson:"published_at"`
	LikeCount         int64              `bson:"like_count"`
	RepostCount       int64              `bson:"repost_count"`
	ReplyCount        int64              `bson:"reply_count"`
	PostURL           string             `bson:"post_url"`
	CreatedAt         time.Time          `bson:"created_at"`
}

// MonitoredAccount 系统格式
type MonitoredAccount struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	UserID          primitive.ObjectID `bson:"user_id"`
	Platform        string             `bson:"platform"`
	PlatformUserID  string             `bson:"platform_user_id"`
	Username        string             `bson:"username"`
	DisplayName     string             `bson:"display_name"`
	AvatarURL       string             `bson:"avatar_url"`
	Bio             string             `bson:"bio"`
	Enabled         bool               `bson:"enabled"`
	FollowerCount   int64              `bson:"follower_count"`
	FollowingCount  int64              `bson:"following_count"`
	CreatedAt       time.Time          `bson:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"`
}

func main() {
	ctx := context.Background()

	// 连接 MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		panic(err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("social_tool")
	postsColl := db.Collection("posts")
	accountsColl := db.Collection("monitored_accounts")

	// 创建测试用户 ID
	userID, _ := primitive.ObjectIDFromHex("65e8f1234567890123456789")

	// 读取关注列表数据
	followingData, err := os.ReadFile("real_following_clean.json")
	if err != nil {
		fmt.Printf("Warning: cannot read following data: %v\n", err)
	} else {
		var following []BirdFollowing
		if err := json.Unmarshal(followingData, &following); err == nil {
			fmt.Printf("Importing %d following accounts...\n", len(following))
			
			for _, f := range following {
				account := MonitoredAccount{
					UserID:          userID,
					Platform:        "twitter",
					PlatformUserID:  f.ID,
					Username:        f.Username,
					DisplayName:     f.Name,
					AvatarURL:       f.ProfileImageURL,
					Bio:             f.Description,
					Enabled:         true,
					FollowerCount:   int64(f.FollowersCount),
					FollowingCount:  int64(f.FollowingCount),
					CreatedAt:       time.Now(),
					UpdatedAt:       time.Now(),
				}
				
				filter := map[string]interface{}{
					"user_id":  userID,
					"platform": "twitter",
					"username": f.Username,
				}
				
				_, err := accountsColl.UpdateOne(ctx, filter, map[string]interface{}{
					"$set": account,
				}, options.Update().SetUpsert(true))
				
				if err != nil {
					fmt.Printf("Error importing %s: %v\n", f.Username, err)
				}
			}
			fmt.Println("Following accounts imported!")
		}
	}

	// 读取推文数据
	tweetsData, err := os.ReadFile("real_data.json")
	if err != nil {
		fmt.Printf("Error reading tweets: %v\n", err)
		return
	}

	var result struct {
		Tweets []BirdTweet `json:"tweets"`
	}
	
	// 尝试解析两种格式
	if err := json.Unmarshal(tweetsData, &result); err != nil {
		// 尝试直接解析为数组
		var tweets []BirdTweet
		if err := json.Unmarshal(tweetsData, &tweets); err != nil {
			fmt.Printf("Error parsing tweets: %v\n", err)
			return
		}
		result.Tweets = tweets
	}

	fmt.Printf("Importing %d tweets...\n", len(result.Tweets))

	for _, t := range result.Tweets {
		publishedAt, _ := time.Parse(time.RubyDate, t.CreatedAt)
		if publishedAt.IsZero() {
			publishedAt, _ = time.Parse("Mon Jan 02 15:04:05 +0000 2006", t.CreatedAt)
		}

		post := Post{
			UserID:            userID,
			Platform:          "twitter",
			PlatformPostID:    t.ID,
			AuthorUsername:    t.Author.Username,
			AuthorDisplayName: t.Author.Name,
			Content:           t.Text,
			PublishedAt:       publishedAt,
			LikeCount:         int64(t.LikeCount),
			RepostCount:       int64(t.RetweetCount),
			ReplyCount:        int64(t.ReplyCount),
			PostURL:           fmt.Sprintf("https://x.com/%s/status/%s", t.Author.Username, t.ID),
			CreatedAt:         time.Now(),
		}

		filter := map[string]interface{}{
			"platform":         "twitter",
			"platform_post_id": t.ID,
		}

		_, err := postsColl.UpdateOne(ctx, filter, map[string]interface{}{
			"$set": post,
		}, options.Update().SetUpsert(true))

		if err != nil {
			fmt.Printf("Error importing tweet %s: %v\n", t.ID, err)
		}
	}

	fmt.Println("Tweets imported successfully!")
}
