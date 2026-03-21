package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/biz"
	"github.com/social-tool/backend/internal/data"
)

type HTTPServer struct {
	mux        *http.ServeMux
	authUC     *biz.AuthUsecase
	socialUC   *biz.SocialUsecase
	jwtManager *auth.JWTManager
}

func NewHTTPServer(authUC *biz.AuthUsecase, socialUC *biz.SocialUsecase, jwtManager *auth.JWTManager) *HTTPServer {
	s := &HTTPServer{
		mux:        http.NewServeMux(),
		authUC:     authUC,
		socialUC:   socialUC,
		jwtManager: jwtManager,
	}
	s.registerRoutes()
	return s
}

func (s *HTTPServer) registerRoutes() {
	s.mux.HandleFunc("GET /api/auth/twitter/url", s.handleGetTwitterOAuthURL)
	s.mux.HandleFunc("POST /api/auth/twitter/callback", s.handleTwitterCallback)
	s.mux.HandleFunc("POST /api/auth/refresh", s.handleRefreshToken)
	s.mux.HandleFunc("GET /api/auth/me", s.authMiddleware(s.handleGetCurrentUser))
	s.mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	s.mux.HandleFunc("GET /api/twitter/following", s.authMiddleware(s.handleGetTwitterFollowing))
	s.mux.HandleFunc("GET /api/twitter/posts", s.authMiddleware(s.handleGetTwitterPosts))
	s.mux.HandleFunc("GET /api/twitter/bird-posts", s.authMiddleware(s.handleGetBirdPosts))
	// bird-cli 专用端点 - 优先使用 bird-cli 获取真实数据
	s.mux.HandleFunc("GET /api/bird/following", s.handleGetBirdFollowing)
	s.mux.HandleFunc("GET /api/bird/posts", s.handleGetBirdPostsSimple)
	// 监控账号相关端点
	s.mux.HandleFunc("GET /api/monitored-accounts", s.handleGetMonitoredAccounts)
	s.mux.HandleFunc("POST /api/monitored-accounts", s.handleAddMonitoredAccount)
	s.mux.HandleFunc("DELETE /api/monitored-accounts", s.handleRemoveMonitoredAccount)
	s.mux.HandleFunc("POST /api/monitored-accounts/check", s.handleCheckMonitoredStatus)
	// 推文相关端点
	s.mux.HandleFunc("GET /api/tweets", s.handleGetTweets)
	s.mux.HandleFunc("POST /api/tweets/refresh", s.handleRefreshTweets)
	s.mux.HandleFunc("GET /api/tweets/comments", s.handleGetTweetComments)
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
}

var allowedOrigins = map[string]struct{}{
	"http://localhost:5173":  {},
	"http://127.0.0.1:5173": {},
}

func (s *HTTPServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if _, ok := allowedOrigins[origin]; ok {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	s.mux.ServeHTTP(w, r)
}

func (s *HTTPServer) ListenAndServe(addr string) error {
	srv := &http.Server{
		Addr:         addr,
		Handler:      s,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
	return srv.ListenAndServe()
}

func (s *HTTPServer) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing authorization header"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := s.jwtManager.ValidateToken(token)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			return
		}
		r = r.WithContext(withUserID(r.Context(), claims.UserID))
		next(w, r)
	}
}

func (s *HTTPServer) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *HTTPServer) handleGetTwitterOAuthURL(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	skipPrompt := q.Get("quick") == "1" || q.Get("quick") == "true"
	result, err := s.authUC.GetTwitterOAuthURL(skipPrompt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"url":           result.URL,
		"state":         result.State,
		"code_verifier": result.CodeVerifier,
	})
}

func (s *HTTPServer) handleTwitterCallback(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code         string `json:"code"`
		State        string `json:"state"`
		CodeVerifier string `json:"code_verifier"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	result, err := s.authUC.HandleTwitterCallback(r.Context(), req.Code, req.CodeVerifier)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
		"expires_in":    result.ExpiresIn,
		"user": map[string]interface{}{
			"id":               result.User.ID.Hex(),
			"twitter_id":       result.User.TwitterID,
			"twitter_username": result.User.TwitterUsername,
			"display_name":     result.User.DisplayName,
			"avatar_url":       result.User.AvatarURL,
		},
	})
}

func (s *HTTPServer) handleRefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	result, err := s.authUC.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
		"expires_in":    result.ExpiresIn,
	})
}

func (s *HTTPServer) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r.Context())
	user, err := s.authUC.GetCurrentUser(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]interface{}{
			"id":               user.ID.Hex(),
			"twitter_id":       user.TwitterID,
			"twitter_username": user.TwitterUsername,
			"display_name":     user.DisplayName,
			"avatar_url":       user.AvatarURL,
			"email":            user.Email,
		},
	})
}

func (s *HTTPServer) handleLogout(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (s *HTTPServer) handleGetTwitterFollowing(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r.Context())
	cursor := r.URL.Query().Get("cursor")

	accounts, nextCursor, err := s.socialUC.GetTwitterFollowing(r.Context(), userID, cursor)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if strings.Contains(msg, "未绑定") || strings.Contains(msg, "重新登录") || strings.Contains(msg, "过期") || strings.Contains(msg, "缺少") {
			status = http.StatusUnauthorized
		}
		writeJSON(w, status, map[string]string{"error": msg})
		return
	}

	list := make([]map[string]interface{}, len(accounts))
	for i, a := range accounts {
		list[i] = map[string]interface{}{
			"platform_user_id": a.PlatformUserID,
			"username":         a.Username,
			"display_name":     a.DisplayName,
			"avatar_url":       a.AvatarURL,
			"bio":              a.Bio,
			"follower_count":   a.FollowerCount,
			"following_count":  a.FollowingCount,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"accounts":    list,
		"next_cursor": nextCursor,
	})
}

func (s *HTTPServer) handleGetTwitterPosts(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r.Context())
	accountID := r.URL.Query().Get("account_id")

	posts, err := s.socialUC.GetTwitterPosts(r.Context(), userID, accountID)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if strings.Contains(msg, "未绑定") || strings.Contains(msg, "重新登录") || strings.Contains(msg, "过期") || strings.Contains(msg, "缺少") {
			status = http.StatusUnauthorized
		}
		writeJSON(w, status, map[string]string{"error": msg})
		return
	}

	list := make([]map[string]interface{}, len(posts))
	for i, p := range posts {
		list[i] = map[string]interface{}{
			"platform_post_id":    p.PlatformPostID,
			"author_username":     p.AuthorUsername,
			"author_display_name": p.AuthorDisplayName,
			"author_avatar_url":   p.AuthorAvatarURL,
			"content":             p.Content,
			"published_at":        p.PublishedAt.Format(time.RFC3339),
			"like_count":          p.LikeCount,
			"repost_count":        p.RepostCount,
			"reply_count":         p.ReplyCount,
			"post_url":            p.PostURL,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"posts": list,
	})
}

func (s *HTTPServer) handleGetBirdPosts(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username is required"})
		return
	}

	// count 参数，默认 20
	count := 20
	if c := r.URL.Query().Get("count"); c != "" {
		fmt.Sscanf(c, "%d", &count)
	}
	if count > 100 {
		count = 100
	}

	posts, err := s.socialUC.GetTwitterPostsByBird(r.Context(), username, count)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(posts))
	for i, p := range posts {
		list[i] = map[string]interface{}{
			"platform_post_id":    p.PlatformPostID,
			"author_username":     p.AuthorUsername,
			"author_display_name": p.AuthorDisplayName,
			"author_avatar_url":   p.AuthorAvatarURL,
			"content":             p.Content,
			"published_at":        p.PublishedAt.Format(time.RFC3339),
			"like_count":          p.LikeCount,
			"repost_count":        p.RepostCount,
			"reply_count":         p.ReplyCount,
			"post_url":            p.PostURL,
			"media_urls":          p.MediaURLs,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"posts":      list,
		"source":     "bird-cli",
		"username":   username,
		"fetched_at": time.Now().Format(time.RFC3339),
	})
}

// handleGetBirdFollowing 使用 bird-cli 获取关注列表（优先从数据库读取，没有再拉取并存入数据库）
func (s *HTTPServer) handleGetBirdFollowing(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username is required"})
		return
	}

	count := 50
	if c := r.URL.Query().Get("count"); c != "" {
		fmt.Sscanf(c, "%d", &count)
	}

	// 获取用户ID（从 JWT 或生成默认ID）
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		// 未提供 user_id，使用 username 的哈希作为默认标识
		// 这样同一 Twitter 账号的数据可以共享
		userID = "default_" + username
	}

	accounts, err := s.socialUC.GetFollowingByBird(r.Context(), userID, username, count)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(accounts))
	for i, a := range accounts {
		list[i] = map[string]interface{}{
			"platform_user_id": a.PlatformUserID,
			"username":         a.Username,
			"display_name":     a.DisplayName,
			"avatar_url":       a.AvatarURL,
			"bio":              a.Bio,
			"follower_count":   a.FollowerCount,
			"following_count":  a.FollowingCount,
			"is_blue_verified": a.IsBlueVerified,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"accounts":   list,
		"source":     "database", // 实际来源可能是数据库或 bird-cli
		"username":   username,
		"fetched_at": time.Now().Format(time.RFC3339),
	})
}

// handleGetBirdPostsSimple 使用 bird-cli 获取推文（不需要 JWT）
func (s *HTTPServer) handleGetBirdPostsSimple(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username is required"})
		return
	}

	count := 20
	if c := r.URL.Query().Get("count"); c != "" {
		fmt.Sscanf(c, "%d", &count)
	}
	if count > 100 {
		count = 100
	}

	posts, err := s.socialUC.GetTwitterPostsByBird(r.Context(), username, count)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(posts))
	for i, p := range posts {
		list[i] = map[string]interface{}{
			"platform_post_id":    p.PlatformPostID,
			"author_username":     p.AuthorUsername,
			"author_display_name": p.AuthorDisplayName,
			"author_avatar_url":   p.AuthorAvatarURL,
			"content":             p.Content,
			"published_at":        p.PublishedAt.Format(time.RFC3339),
			"like_count":          p.LikeCount,
			"repost_count":        p.RepostCount,
			"reply_count":         p.ReplyCount,
			"post_url":            p.PostURL,
			"media_urls":          p.MediaURLs,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"posts":      list,
		"source":     "bird-cli",
		"username":   username,
		"fetched_at": time.Now().Format(time.RFC3339),
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// handleGetMonitoredAccounts 获取监控账号列表
func (s *HTTPServer) handleGetMonitoredAccounts(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id is required"})
		return
	}

	accounts, err := s.socialUC.GetMonitoredAccounts(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(accounts))
	for i, a := range accounts {
		list[i] = map[string]interface{}{
			"id":               a.ID.Hex(),
			"platform_user_id": a.PlatformUserID,
			"username":         a.Username,
			"display_name":     a.DisplayName,
			"avatar_url":       a.AvatarURL,
			"bio":              a.Bio,
			"follower_count":   a.FollowerCount,
			"following_count":  a.FollowingCount,
			"is_blue_verified": a.IsBlueVerified,
			"enabled":          a.Enabled,
			"created_at":       a.CreatedAt.Format(time.RFC3339),
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"accounts": list,
		"total":    len(accounts),
	})
}

// handleAddMonitoredAccount 添加监控账号
func (s *HTTPServer) handleAddMonitoredAccount(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID         string `json:"user_id"`
		PlatformUserID string `json:"platform_user_id"`
		Username       string `json:"username"`
		DisplayName    string `json:"display_name"`
		AvatarURL      string `json:"avatar_url"`
		Bio            string `json:"bio"`
		FollowerCount  int64  `json:"follower_count"`
		FollowingCount int64  `json:"following_count"`
		IsBlueVerified bool   `json:"is_blue_verified"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.UserID == "" || req.Username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id and username are required"})
		return
	}

	account := &data.MonitoredAccount{
		PlatformUserID: req.PlatformUserID,
		Username:       req.Username,
		DisplayName:    req.DisplayName,
		AvatarURL:      req.AvatarURL,
		Bio:            req.Bio,
		FollowerCount:  req.FollowerCount,
		FollowingCount: req.FollowingCount,
		IsBlueVerified: req.IsBlueVerified,
	}

	if err := s.socialUC.AddMonitoredAccount(r.Context(), req.UserID, account); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "account added to monitoring",
		"username": req.Username,
	})
}

// handleRemoveMonitoredAccount 移除监控账号
func (s *HTTPServer) handleRemoveMonitoredAccount(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	username := r.URL.Query().Get("username")

	if userID == "" || username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id and username are required"})
		return
	}

	if err := s.socialUC.RemoveMonitoredAccount(r.Context(), userID, username); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "account removed from monitoring",
		"username": username,
	})
}

// handleCheckMonitoredStatus 批量检查监控状态
func (s *HTTPServer) handleCheckMonitoredStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID    string   `json:"user_id"`
		Usernames []string `json:"usernames"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.UserID == "" || len(req.Usernames) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id and usernames are required"})
		return
	}

	status, err := s.socialUC.CheckMonitoredStatus(r.Context(), req.UserID, req.Usernames)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status": status,
	})
}

// handleGetTweets 获取监控账号的推文列表
func (s *HTTPServer) handleGetTweets(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id is required"})
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	tweets, err := s.socialUC.GetTweetsForMonitoredAccounts(r.Context(), userID, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(tweets))
	for i, t := range tweets {
		list[i] = map[string]interface{}{
			"id":                     t.ID.Hex(),
			"platform_post_id":       t.PlatformPostID,
			"author_username":        t.AuthorUsername,
			"author_display_name":    t.AuthorDisplayName,
			"author_avatar_url":      t.AuthorAvatarURL,
			"author_is_blue_verified": t.AuthorIsBlueVerified,
			"content":                t.Content,
			"media_urls":             t.MediaURLs,
			"post_url":               t.PostURL,
			"published_at":           t.PublishedAt.Format(time.RFC3339),
			"like_count":             t.LikeCount,
			"repost_count":           t.RepostCount,
			"reply_count":            t.ReplyCount,
			"view_count":             t.ViewCount,
			"is_reply":               t.IsReply,
			"is_quote":               t.IsQuote,
			"language":               t.Language,
			"fetched_at":             t.FetchedAt.Format(time.RFC3339),
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"tweets": list,
		"total":  len(tweets),
	})
}

// handleRefreshTweets 刷新监控账号的推文
func (s *HTTPServer) handleRefreshTweets(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.UserID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id is required"})
		return
	}

	// 刷新所有监控账号的推文（使用 background context，避免请求结束后 context 被取消）
	go func() {
		if err := s.socialUC.RefreshTweetsForMonitoredAccounts(context.Background(), req.UserID); err != nil {
			fmt.Printf("[WARN] Failed to refresh tweets: %v\n", err)
		}
	}()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "refresh started",
	})
}

// handleGetTweetComments 获取推文的评论
func (s *HTTPServer) handleGetTweetComments(w http.ResponseWriter, r *http.Request) {
	platformPostID := r.URL.Query().Get("platform_post_id")
	if platformPostID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "platform_post_id is required"})
		return
	}
	userID := r.URL.Query().Get("user_id")

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	comments, err := s.socialUC.GetTweetComments(r.Context(), userID, platformPostID, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	list := make([]map[string]interface{}, len(comments))
	for i, c := range comments {
		list[i] = map[string]interface{}{
			"id":                     c.ID.Hex(),
			"platform_comment_id":    c.PlatformCommentID,
			"platform_post_id":       c.PlatformPostID,
			"author_username":        c.AuthorUsername,
			"author_display_name":    c.AuthorDisplayName,
			"author_avatar_url":      c.AuthorAvatarURL,
			"author_is_blue_verified": c.AuthorIsBlueVerified,
			"content":                c.Content,
			"like_count":             c.LikeCount,
			"published_at":           c.PublishedAt.Format(time.RFC3339),
			"is_reply":               c.IsReply,
			"reply_to_username":      c.ReplyToUsername,
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"comments": list,
		"total":    len(comments),
	})
}
