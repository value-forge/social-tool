package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"gopkg.in/yaml.v3"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/biz"
	"github.com/social-tool/backend/internal/conf"
	"github.com/social-tool/backend/internal/data"
	"github.com/social-tool/backend/internal/platform/twitter"
	"github.com/social-tool/backend/internal/server"
)

var configPath string

func init() {
	flag.StringVar(&configPath, "conf", "configs/config.yaml", "config file path")
}

func main() {
	flag.Parse()

	bc, err := loadConfig(configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// 设置环境变量以解决 TLS 证书验证问题
	os.Setenv("NODE_TLS_REJECT_UNAUTHORIZED", "0")

	dataLayer, cleanup, err := data.NewData(bc.Data)
	if err != nil {
		log.Fatalf("init data: %v", err)
	}
	defer cleanup()

	userRepo := data.NewUserRepo(dataLayer)
	connRepo := data.NewPlatformConnectionRepo(dataLayer)
	followingRepo := data.NewTwitterFollowingRepo(dataLayer)
	monitoredAccountRepo := data.NewMonitoredAccountRepo(dataLayer)
	tweetRepo := data.NewTweetRepo(dataLayer)
	tweetCommentRepo := data.NewTweetCommentRepo(dataLayer)

	twitterOAuth := auth.NewTwitterOAuth(
		bc.Twitter.ClientId,
		bc.Twitter.ClientSecret,
		bc.Twitter.CallbackUrl,
	)
	jwtManager := auth.NewJWTManager(bc.Auth.JwtSecret)

	authUC := biz.NewAuthUsecase(twitterOAuth, jwtManager, userRepo, connRepo)
	twAdapter := twitter.NewAdapter()
	socialUC := biz.NewSocialUsecase(connRepo, twAdapter, twitterOAuth, followingRepo, monitoredAccountRepo, tweetRepo, tweetCommentRepo)

	httpServer := server.NewHTTPServer(authUC, socialUC, jwtManager)

	addr := bc.Server.Http.Addr
	fmt.Printf("Social Tool backend starting on %s\n", addr)
	if err := httpServer.ListenAndServe(addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func loadConfig(path string) (*conf.Bootstrap, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	raw = []byte(os.ExpandEnv(string(raw)))

	var yamlConf struct {
		Server struct {
			HTTP struct {
				Addr    string `yaml:"addr"`
				Timeout string `yaml:"timeout"`
			} `yaml:"http"`
			GRPC struct {
				Addr    string `yaml:"addr"`
				Timeout string `yaml:"timeout"`
			} `yaml:"grpc"`
		} `yaml:"server"`
		Data struct {
			MongodbURI string `yaml:"mongodb_uri"`
			RedisURI   string `yaml:"redis_uri"`
			Database   string `yaml:"database"`
		} `yaml:"data"`
		Auth struct {
			JwtSecret     string `yaml:"jwt_secret"`
			EncryptionKey string `yaml:"encryption_key"`
		} `yaml:"auth"`
		Twitter struct {
			ClientID     string `yaml:"client_id"`
			ClientSecret string `yaml:"client_secret"`
			CallbackURL  string `yaml:"callback_url"`
			BearerToken  string `yaml:"bearer_token"`
		} `yaml:"twitter"`
		Bird struct {
			AuthToken string `yaml:"auth_token"`
			Ct0       string `yaml:"ct0"`
		} `yaml:"bird"`
		LLM struct {
			KimiAPIKey   string `yaml:"kimi_api_key"`
			ClaudeAPIKey string `yaml:"claude_api_key"`
		} `yaml:"llm"`
	}

	if err := yaml.Unmarshal(raw, &yamlConf); err != nil {
		return nil, fmt.Errorf("unmarshal yaml: %w", err)
	}

	// 设置 bird-cli token 环境变量（从配置文件读取）
	if yamlConf.Bird.AuthToken != "" {
		os.Setenv("AUTH_TOKEN", yamlConf.Bird.AuthToken)
		fmt.Println("[config] AUTH_TOKEN loaded from config")
	}
	if yamlConf.Bird.Ct0 != "" {
		os.Setenv("CT0", yamlConf.Bird.Ct0)
		fmt.Println("[config] CT0 loaded from config")
	}

	return &conf.Bootstrap{
		Server: &conf.Server{
			Http: &conf.Server_HTTP{
				Addr:    yamlConf.Server.HTTP.Addr,
				Timeout: yamlConf.Server.HTTP.Timeout,
			},
			Grpc: &conf.Server_GRPC{
				Addr:    yamlConf.Server.GRPC.Addr,
				Timeout: yamlConf.Server.GRPC.Timeout,
			},
		},
		Data: &conf.Data{
			MongodbUri: yamlConf.Data.MongodbURI,
			RedisUri:   yamlConf.Data.RedisURI,
			Database:   yamlConf.Data.Database,
		},
		Auth: &conf.Auth{
			JwtSecret:     yamlConf.Auth.JwtSecret,
			EncryptionKey: yamlConf.Auth.EncryptionKey,
		},
		Twitter: &conf.Twitter{
			ClientId:     yamlConf.Twitter.ClientID,
			ClientSecret: yamlConf.Twitter.ClientSecret,
			CallbackUrl:  yamlConf.Twitter.CallbackURL,
			BearerToken:  yamlConf.Twitter.BearerToken,
		},
		Llm: &conf.LLM{
			KimiApiKey:   yamlConf.LLM.KimiAPIKey,
			ClaudeApiKey: yamlConf.LLM.ClaudeAPIKey,
		},
	}, nil
}

func init() {
	// 从配置文件加载 bird token 到环境变量（如果存在）
	// 这样 bird-cli 可以读取到这些值
	if authToken := os.Getenv("AUTH_TOKEN"); authToken == "" {
		// 稍后从配置文件读取
	}
}
