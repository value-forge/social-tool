package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	MongoURI        string
	MongoDB         string
	KimiAPIKey      string
	KimiModel       string
	KimiTimeout     time.Duration
	BirdAuthToken   string
	BirdCT0         string
	DingTalkWebhook string
	AIProcessorCount int
	FetchInterval   time.Duration
	LogLevel        string
	LogPath         string
}

func Load() *Config {
	return &Config{
		MongoURI:         getEnv("MONGODB_URI", "mongodb://admin:password@localhost:27017/social_tool?authSource=admin"),
		MongoDB:          getEnv("MONGODB_DB", "social_tool"),
		KimiAPIKey:       getEnv("KIMI_API_KEY", "sk-kimi-9wUzwv2Moa7bRcgqfdoOXIpDIqLJR9VChfV4x5dl8NwaDlszGW3oCrcRqm6DnB58"),
		KimiModel:        getEnv("KIMI_MODEL", "kimi-k2-thinking"),
		KimiTimeout:      getDuration("KIMI_TIMEOUT", 2*time.Minute),
		BirdAuthToken:    getEnv("BIRD_AUTH_TOKEN", ""),
		BirdCT0:          getEnv("BIRD_CT0", ""),
		DingTalkWebhook:  getEnv("DINGTALK_WEBHOOK", "https://oapi.dingtalk.com/robot/send?access_token=3aa3d51d8e0d30f7a6038ea085d90b3e00ae28a11fb0d72ce7d0bd91207f4abc"),
		AIProcessorCount: getInt("AI_PROCESSOR_COUNT", 1),
		FetchInterval:    getDuration("FETCH_INTERVAL", 5*time.Minute),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		LogPath:          getEnv("LOG_PATH", "./logs/social-tool.log"),
	}
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

func getInt(key string, defaultValue int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultValue
}

func getDuration(key string, defaultValue time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultValue
}
