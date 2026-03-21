package main

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	ctx := context.Background()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		panic(err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("social_tool")
	postsColl := db.Collection("posts")
	tweetsColl := db.Collection("tweets")
	
	// 从 posts 读取数据
	cursor, err := postsColl.Find(ctx, bson.M{})
	if err != nil {
		panic(err)
	}
	defer cursor.Close(ctx)
	
	var count int
	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		
		// 插入到 tweets 集合
		_, err := tweetsColl.UpdateOne(ctx,
			bson.M{"user_id": doc["user_id"], "platform_post_id": doc["platform_post_id"]},
			bson.M{"$set": doc},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
		} else {
			count++
		}
	}
	
	fmt.Printf("Migrated %d documents\n", count)
}
