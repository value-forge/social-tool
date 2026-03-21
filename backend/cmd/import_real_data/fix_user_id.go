package main

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
	
	// 新的 user_id
	newUserID, _ := primitive.ObjectIDFromHex("42e8aa9424fada17be21c6f0")
	oldUserID, _ := primitive.ObjectIDFromHex("65e8f1234567890123456789")
	
	// 更新 tweets 集合
	tweetsColl := db.Collection("posts")
	result, err := tweetsColl.UpdateMany(ctx, 
		bson.M{"user_id": oldUserID},
		bson.M{"$set": bson.M{"user_id": newUserID}},
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Updated %d tweets\n", result.ModifiedCount)
	
	// 更新 monitored_accounts 集合
	accountsColl := db.Collection("monitored_accounts")
	result, err = accountsColl.UpdateMany(ctx,
		bson.M{"user_id": oldUserID},
		bson.M{"$set": bson.M{"user_id": newUserID}},
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Updated %d accounts\n", result.ModifiedCount)
	
	// 也更新 twitter_following 集合
	followingColl := db.Collection("twitter_following")
	result, err = followingColl.UpdateMany(ctx,
		bson.M{"user_id": oldUserID},
		bson.M{"$set": bson.M{"user_id": newUserID}},
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Updated %d following\n", result.ModifiedCount)
	
	fmt.Println("Done!")
}
