package main

import (
	"context"
	"os"
	"os/signal"
	"social-tool/internal/conf"
	"social-tool/internal/data"
	"social-tool/internal/worker"
	"syscall"
	"time"

	"github.com/go-kratos/kratos/v2/config"
	"github.com/go-kratos/kratos/v2/config/file"
	"github.com/go-kratos/kratos/v2/log"
	stdlog "log"
)

func main() {
	logger := log.NewStdLogger(os.Stdout)

	c := config.New(
		config.WithSource(
			file.NewSource("../../configs"),
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

	// 创建 worker
	w := worker.NewWorker(userRepo, tweetRepo, monitorRepo, twitterUserRepo, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 启动 worker
	go w.Start(ctx)

	stdlog.Println("Worker started")

	// 等待退出信号
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	stdlog.Println("Shutdown signal received")
	cancel()
	time.Sleep(1 * time.Second)
	stdlog.Println("Worker stopped")
}