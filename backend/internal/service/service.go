package service

import (
	"encoding/json"
	"net/http"
	"regexp"
	"social-tool/internal/data"
	"strconv"
	"strings"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// SocialToolService 服务实现
type SocialToolService struct {
	userRepo        *data.UserRepo
	tweetRepo       *data.TweetRepo
	monitorRepo     *data.MonitorRepo
	twitterUserRepo *data.TwitterUserRepo
	log             *log.Helper
}

// NewSocialToolService 创建服务
func NewSocialToolService(
	userRepo *data.UserRepo,
	tweetRepo *data.TweetRepo,
	monitorRepo *data.MonitorRepo,
	twitterUserRepo *data.TwitterUserRepo,
	logger log.Logger,
) *SocialToolService {
	return &SocialToolService{
		userRepo:        userRepo,
		tweetRepo:       tweetRepo,
		monitorRepo:     monitorRepo,
		twitterUserRepo: twitterUserRepo,
		log:             log.NewHelper(logger),
	}
}

// Login 登录
func (s *SocialToolService) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	if !emailRegex.MatchString(req.Email) {
		respondError(w, 400, "invalid email format")
		return
	}
	if req.Password != "88888888" {
		respondError(w, 401, "invalid password")
		return
	}

	user, err := s.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// 自动创建用户
	if user == nil {
		name := req.Email
		if idx := strings.Index(req.Email, "@"); idx > 0 {
			name = req.Email[:idx]
		}
		newUser := &data.User{
			Email: req.Email,
			Name:  name,
		}
		if err := s.userRepo.Create(r.Context(), newUser); err != nil {
			respondError(w, 500, "failed to create user")
			return
		}
		user, _ = s.userRepo.GetByEmail(r.Context(), req.Email)
	}

	if user == nil {
		respondError(w, 500, "failed to get user")
		return
	}

	token := "token_" + user.ID.Hex() + "_" + user.Email

	respondJSON(w, 200, "success", map[string]interface{}{
		"token":     token,
		"expiresIn": 604800,
		"user": map[string]interface{}{
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

// GetMe 获取当前用户
func (s *SocialToolService) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	user, err := s.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if user == nil {
		respondError(w, 401, "unauthorized")
		return
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"id":     user.ID.Hex(),
		"email":  user.Email,
		"name":   user.Name,
		"avatar": user.Avatar,
		"settings": map[string]interface{}{
			"dingtalkWebhook": user.Settings.DingTalkWebhook,
		},
		"notifications": map[string]interface{}{
			"dingtalk": user.Notifications.DingTalk,
		},
	})
}

// ListMonitors 获取监控列表
func (s *SocialToolService) ListMonitors(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	page, limit := parsePagination(r)

	monitors, total, err := s.monitorRepo.ListByUser(r.Context(), userID, page, limit)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// 获取关联的 Twitter 用户信息
	var twitterUserIDs []primitive.ObjectID
	for _, m := range monitors {
		twitterUserIDs = append(twitterUserIDs, m.TwitterUserID)
	}

	twitterUsers, err := s.twitterUserRepo.GetByIDs(r.Context(), twitterUserIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	list := make([]interface{}, 0, len(monitors))
	for _, m := range monitors {
		user := twitterUsers[m.TwitterUserID]
		item := map[string]interface{}{
			"id":     m.ID.Hex(),
			"status": m.Status,
			"notes":  m.Notes,
		}
		if user != nil {
			item["username"] = user.Username
			item["profile"] = map[string]interface{}{
				"displayName": user.Profile.DisplayName,
				"avatar":      user.Profile.Avatar,
			}
		}
		list = append(list, item)
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"total": total,
		"page":  page,
		"limit": limit,
		"list":  list,
	})
}

// AddMonitor 添加监控
func (s *SocialToolService) AddMonitor(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var req struct {
		Username string `json:"username"`
		Notes    string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	username := strings.TrimPrefix(strings.TrimSpace(req.Username), "@")
	if username == "" {
		respondError(w, 400, "username is required")
		return
	}

	// 查找或创建 Twitter 用户
	twitterUser, err := s.twitterUserRepo.GetByUsername(r.Context(), username)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	if twitterUser == nil {
		twitterUser = &data.TwitterUser{
			TwitterID:     username,
			Username:      username,
			RefCount:      0,
			MonitorStatus: 1,
			Profile: data.Profile{
				DisplayName: username,
			},
		}
		id, err := s.twitterUserRepo.CreateOrUpdate(r.Context(), twitterUser)
		if err != nil {
			respondError(w, 500, "failed to create twitter user")
			return
		}
		twitterUser.ID = *id
	}

	// 检查是否已监控
	exists, err := s.monitorRepo.Exists(r.Context(), userID, twitterUser.ID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if exists {
		respondError(w, 400, "already monitored")
		return
	}

	// 创建监控记录
	monitor := &data.Monitor{
		UserID:        userID,
		TwitterUserID: twitterUser.ID,
		Status:        1,
		Notes:         req.Notes,
		CT:            time.Now(),
		UT:            time.Now(),
	}
	if err := s.monitorRepo.Create(r.Context(), monitor); err != nil {
		respondError(w, 500, "failed to create monitor")
		return
	}

	// 更新引用计数
	_ = s.twitterUserRepo.UpdateRefCount(r.Context(), twitterUser.TwitterID, 1)

	respondJSON(w, 200, "success", map[string]interface{}{
		"id":       monitor.ID.Hex(),
		"username": twitterUser.Username,
		"status":   1,
	})
}

// GetTweetsFeed 获取推文动态
func (s *SocialToolService) GetTweetsFeed(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	page, limit := parsePagination(r)

	// 获取用户监控的 Twitter 用户 ID
	twitterUserIDs, err := s.monitorRepo.ListTwitterUserIDsByUser(r.Context(), userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// 查询推文
	tweets, total, err := s.tweetRepo.ListFeedPaginated(r.Context(), twitterUserIDs, page, limit)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// 获取作者信息
	authorIDSet := make(map[primitive.ObjectID]struct{})
	for _, t := range tweets {
		authorIDSet[t.TwitterUserID] = struct{}{}
	}
	authorIDs := make([]primitive.ObjectID, 0, len(authorIDSet))
	for id := range authorIDSet {
		authorIDs = append(authorIDs, id)
	}

	authors, err := s.twitterUserRepo.GetByIDs(r.Context(), authorIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	list := make([]interface{}, 0, len(tweets))
	for _, t := range tweets {
		author := authors[t.TwitterUserID]
		item := map[string]interface{}{
			"id":      t.ID.Hex(),
			"tweetId": t.TweetID,
			"text":    t.Text,
		}
		if author != nil {
			item["author"] = map[string]interface{}{
				"username": author.Username,
				"profile": map[string]interface{}{
					"displayName": author.Profile.DisplayName,
					"avatar":      author.Profile.Avatar,
				},
			}
		}
		list = append(list, item)
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"total": total,
		"page":  page,
		"limit": limit,
		"list":  list,
	})
}

// GetStatsOverview 获取统计概览
func (s *SocialToolService) GetStatsOverview(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	count, err := s.monitorRepo.CountByUser(r.Context(), userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"monitors": map[string]interface{}{
			"total":  count,
			"active": count,
			"paused": 0,
		},
		"tweets": map[string]interface{}{
			"total":     0,
			"today":     0,
			"pending":   0,
			"completed": 0,
		},
	})
}

// 辅助函数
func respondJSON(w http.ResponseWriter, code int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    code,
		"message": message,
		"data":    data,
	})
}

func respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    code,
		"message": message,
		"data":    nil,
	})
}

func getUserID(r *http.Request) primitive.ObjectID {
	// 简化实现，实际应从 JWT token 解析
	// 这里返回一个固定的 ObjectID 用于测试
	id, _ := primitive.ObjectIDFromHex("000000000000000000000001")
	return id
}

func parsePagination(r *http.Request) (page, limit int) {
	page = 1
	limit = 20
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	return
}