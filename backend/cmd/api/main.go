package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"social-tool/internal/api"
	"social-tool/internal/config"
	"social-tool/internal/data"
	"strings"
	"syscall"
	"time"
)

func init() {
	os.Setenv("TZ", "Asia/Shanghai")
}

func main() {
	cfg := config.Load()

	db, err := data.NewMongoDB(cfg)
	if err != nil {
		log.Fatalf("MongoDB connect failed: %v", err)
	}
	defer db.Close()
	log.Println("MongoDB connected")

	if err := initDB(context.Background(), db); err != nil {
		log.Printf("WARN: Init DB indexes (non-fatal): %v", err)
	}

	userRepo := data.NewUserRepo(db.DB())
	twitterUserRepo := data.NewTwitterUserRepo(db.DB())
	monitorRepo := data.NewUserMonitoredAccountRepo(db.DB())
	tweetRepo := data.NewTweetRepo(db.DB())

	h := api.NewHandler(userRepo, twitterUserRepo, monitorRepo, tweetRepo)

	mux := http.NewServeMux()

	// Public route
	mux.HandleFunc("/api/v1/auth/login", methodGuard("POST", h.Login))

	// Protected routes
	mux.HandleFunc("/api/v1/user/me", methodGuard("GET", api.RequireAuth(h.GetMe)))
	mux.HandleFunc("/api/v1/monitors/add", methodGuard("POST", api.RequireAuth(h.AddMonitor)))
	mux.HandleFunc("/api/v1/monitors", api.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		// /api/v1/monitors — exact match for GET list
		// /api/v1/monitors/{id} — DELETE or PUT with path suffix
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/monitors")
		path = strings.TrimPrefix(path, "/")

		if path == "" {
			// GET /api/v1/monitors
			if r.Method != http.MethodGet {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			h.ListMonitors(w, r)
			return
		}

		// path is the {id} part
		// Store id in query for handler access
		r.Header.Set("X-Path-ID", path)
		switch r.Method {
		case http.MethodDelete:
			h.DeleteMonitor(w, r)
		case http.MethodPut:
			h.UpdateMonitor(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/v1/tweets/feed", methodGuard("GET", api.RequireAuth(h.GetTweetsFeed)))
	mux.HandleFunc("/api/v1/settings/dingtalk", methodGuard("PUT", api.RequireAuth(h.UpdateDingTalk)))
	mux.HandleFunc("/api/v1/stats/overview", methodGuard("GET", api.RequireAuth(h.GetStatsOverview)))

	// Wrap with CORS
	handler := api.CORSMiddleware(mux)

	addr := ":8080"
	srv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("API server starting on %s\n", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutdown signal received")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Println("Server stopped")
}

func methodGuard(method string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			// Let CORS middleware handle it
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != method {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		next(w, r)
	}
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
