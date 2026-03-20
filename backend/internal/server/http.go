package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/social-tool/backend/internal/auth"
	"github.com/social-tool/backend/internal/biz"
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

func (s *HTTPServer) handleGetTwitterOAuthURL(w http.ResponseWriter, _ *http.Request) {
	result, err := s.authUC.GetTwitterOAuthURL()
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

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
