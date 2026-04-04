package main

import (
	"flag"
	"net/http"
	"os"

	"social-tool/internal/conf"
	"social-tool/internal/data"
	"social-tool/internal/service"

	"github.com/go-kratos/kratos/v2/config"
	"github.com/go-kratos/kratos/v2/config/file"
	"github.com/go-kratos/kratos/v2/log"
)

var (
	Name    = "social-tool"
	Version = "v1.0.0"
	flagconf string
)

func init() {
	flag.StringVar(&flagconf, "conf", "../../configs", "config path")
}

func main() {
	flag.Parse()
	logger := log.With(log.NewStdLogger(os.Stdout),
		"ts", log.DefaultTimestamp,
		"caller", log.DefaultCaller,
		"service.id", Name,
		"service.name", Name,
		"service.version", Version,
	)

	c := config.New(
		config.WithSource(
			file.NewSource(flagconf),
		),
	)
	defer c.Close()

	if err := c.Load(); err != nil {
		panic(err)
	}

	var bc conf.Bootstrap
	if err := c.Scan(&bc); err != nil {
		panic(err)
	}

	// 初始化数据层
	dataLayer, cleanup, err := data.NewData(bc.Data, logger)
	if err != nil {
		panic(err)
	}
	defer cleanup()

	// 初始化仓库
	userRepo := data.NewUserRepo(dataLayer)
	tweetRepo := data.NewTweetRepo(dataLayer)
	monitorRepo := data.NewMonitorRepo(dataLayer)
	twitterUserRepo := data.NewTwitterUserRepo(dataLayer)

	// 初始化服务层
	svc := service.NewSocialToolService(userRepo, tweetRepo, monitorRepo, twitterUserRepo, logger)

	// 注册路由
	http.HandleFunc("/api/v1/auth/login", svc.Login)
	http.HandleFunc("/api/v1/user/me", svc.GetMe)
	http.HandleFunc("/api/v1/monitors", svc.ListMonitors)
	http.HandleFunc("/api/v1/monitors/add", svc.AddMonitor)
	http.HandleFunc("/api/v1/tweets/feed", svc.GetTweetsFeed)
	http.HandleFunc("/api/v1/stats/overview", svc.GetStatsOverview)

	logger.Log(log.LevelInfo, "msg", "HTTP server starting", "addr", bc.Server.Http.Addr)
	if err := http.ListenAndServe(bc.Server.Http.Addr, nil); err != nil {
		panic(err)
	}
}