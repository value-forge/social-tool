package main

import (
	"context"
	"os"
	"os/signal"
	"social-tool/internal/config"
	"social-tool/internal/data"
	"social-tool/internal/worker"
	"syscall"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

func init() {
	// 设置时区为北京时间
	os.Setenv("TZ", "Asia/Shanghai")
}

func main() {
	cfg := config.Load()
	logger := initLogger(cfg)
	defer logger.Sync()

	logger.Info("Starting Social Tool Worker")

	db, err := data.NewMongoDB(cfg)
	if err != nil {
		logger.Fatal("MongoDB connect failed", zap.Error(err))
	}
	defer db.Close()

	logger.Info("MongoDB connected")

	if err := initDB(context.Background(), db); err != nil {
		logger.Fatal("Init DB failed", zap.Error(err))
	}

	if err := initTestData(context.Background(), db, logger); err != nil {
		logger.Fatal("Init test data failed", zap.Error(err))
	}

	logger.Info("Test data initialized")

	w := worker.New(cfg, db, logger)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go w.Start(ctx)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	logger.Info("Shutdown signal received")
	cancel()
}

func initLogger(cfg *config.Config) *zap.Logger {
	logWriter := &lumberjack.Logger{
		Filename:   cfg.LogPath,
		MaxSize:    100,
		MaxBackups: 30,
		MaxAge:     7,
		Compress:   true,
	}

	level := zap.InfoLevel
	switch cfg.LogLevel {
	case "debug":
		level = zap.DebugLevel
	case "warn":
		level = zap.WarnLevel
	case "error":
		level = zap.ErrorLevel
	}

	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "time",
		LevelKey:       "level",
		MessageKey:     "msg",
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
	}

	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.AddSync(logWriter),
		level,
	)

	return zap.New(core, zap.AddCaller())
}

func initDB(ctx context.Context, db *data.MongoDB) error {
	repos := []interface{ InitIndexes(ctx context.Context) error }{
		data.NewUserRepo(db.DB()),
		data.NewTwitterUserRepo(db.DB()),
		data.NewUserMonitoredAccountRepo(db.DB()),
		data.NewTweetRepo(db.DB()),
	}
	for _, repo := range repos {
		if err := repo.InitIndexes(ctx); err != nil {
			return err
		}
	}
	return nil
}
