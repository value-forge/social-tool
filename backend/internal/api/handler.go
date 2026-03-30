package api

import (
	"encoding/json"
	"math"
	"net/http"
	"regexp"
	"social-tool/internal/data"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Handler holds dependencies for API handlers
type Handler struct {
	userRepo        *data.UserRepo
	twitterUserRepo *data.TwitterUserRepo
	monitorRepo     *data.UserMonitoredAccountRepo
	tweetRepo       *data.TweetRepo
}

// NewHandler creates a new API handler
func NewHandler(
	userRepo *data.UserRepo,
	twitterUserRepo *data.TwitterUserRepo,
	monitorRepo *data.UserMonitoredAccountRepo,
	tweetRepo *data.TweetRepo,
) *Handler {
	return &Handler{
		userRepo:        userRepo,
		twitterUserRepo: twitterUserRepo,
		monitorRepo:     monitorRepo,
		tweetRepo:       tweetRepo,
	}
}

// ========== 1. POST /auth/login ==========

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
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

	ctx := r.Context()
	user, err := h.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Auto-create user if not exists
	if user == nil {
		name := req.Email
		if idx := strings.Index(req.Email, "@"); idx > 0 {
			name = req.Email[:idx]
		}
		newUser := &data.User{
			Email: req.Email,
			Name:  name,
		}
		if err := h.userRepo.Create(ctx, newUser); err != nil {
			respondError(w, 500, "failed to create user")
			return
		}
		// Re-fetch so we get the FullUser with all fields
		user, err = h.userRepo.GetByEmail(ctx, req.Email)
		if err != nil || user == nil {
			respondError(w, 500, "failed to fetch created user")
			return
		}
	}

	token, err := GenerateToken(user.ID, user.Email)
	if err != nil {
		respondError(w, 500, "failed to generate token")
		return
	}

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

// ========== 2. GET /user/me ==========

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if user == nil {
		respondError(w, 401, "unauthorized")
		return
	}

	result := map[string]interface{}{
		"id":     user.ID.Hex(),
		"email":  user.Email,
		"name":   user.Name,
		"avatar": user.Avatar,
		"settings": map[string]interface{}{
			"dingtalkWebhook": maskWebhook(user.Settings.DingTalkWebhook),
		},
		"notifications": map[string]interface{}{
			"dingtalk": user.Notifications.DingTalk,
		},
	}

	if user.Twitter != nil {
		result["twitter"] = map[string]interface{}{
			"username": user.Twitter.Username,
		}
	} else {
		result["twitter"] = nil
	}

	respondJSON(w, 200, "success", result)
}

// ========== 3. GET /monitors ==========

func (h *Handler) ListMonitors(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	page, limit := parsePagination(r)

	var statusPtr *int
	if s := r.URL.Query().Get("status"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			statusPtr = &v
		}
	}

	accounts, total, err := h.monitorRepo.ListByUserPaginated(r.Context(), userID, statusPtr, page, limit)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Collect twitter user IDs for batch lookup
	twitterUserIDs := make([]primitive.ObjectID, 0, len(accounts))
	for _, a := range accounts {
		twitterUserIDs = append(twitterUserIDs, a.TwitterUserID)
	}

	twitterUsers, err := h.twitterUserRepo.GetByIDs(r.Context(), twitterUserIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	list := make([]interface{}, 0, len(accounts))
	for _, a := range accounts {
		item := map[string]interface{}{
			"id":     a.ID.Hex(),
			"status": a.Status,
			"notes":  a.Notes,
			"ct":     formatTime(a.CT),
			"ut":     formatTime(a.UT),
		}

		if tu, ok := twitterUsers[a.TwitterUserID]; ok {
			item["twitterUserId"] = tu.TwitterID
			item["username"] = tu.Username
			item["profile"] = map[string]interface{}{
				"displayName": tu.Profile.DisplayName,
				"avatar":      tu.Profile.Avatar,
				"bio":         tu.Profile.Bio,
				"verified":    tu.Profile.Verified,
				"location":    tu.Profile.Location,
				"website":     tu.Profile.Website,
			}
			item["stats"] = map[string]interface{}{
				"followersCount": tu.Stats.FollowersCount,
				"followingCount": tu.Stats.FollowingCount,
				"tweetsCount":    tu.Stats.TweetsCount,
				"updatedAt":      formatTime(tu.Stats.UpdatedAt),
			}
			item["monitorStatus"] = tu.MonitorStatus
			item["lastFetchedAt"] = formatTimePtr(tu.LastFetchedAt)
		} else {
			item["twitterUserId"] = ""
			item["username"] = ""
			item["profile"] = map[string]interface{}{}
			item["stats"] = map[string]interface{}{}
			item["monitorStatus"] = 0
			item["lastFetchedAt"] = nil
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

// ========== 4. POST /monitors/add ==========

func (h *Handler) AddMonitor(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()

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

	// Find twitter user by username
	twitterUser, err := h.twitterUserRepo.GetByUsername(ctx, username)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	if twitterUser == nil {
		// Create a minimal twitter user record; worker will fill profile later
		twitterUser = &data.TwitterUser{
			TwitterID:     username, // placeholder until worker resolves real ID
			Username:      username,
			RefCount:      0,
			MonitorStatus: 1,
			Profile:       data.Profile{DisplayName: username},
		}
		id, err := h.twitterUserRepo.CreateOrUpdate(ctx, twitterUser)
		if err != nil {
			respondError(w, 500, "failed to create twitter user")
			return
		}
		twitterUser.ID = *id
	}

	// Check duplicate
	exists, err := h.monitorRepo.Exists(ctx, userID, twitterUser.ID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if exists {
		respondError(w, 409, "already monitored")
		return
	}

	// Create monitor record
	monitor := &data.UserMonitoredAccount{
		UserID:        userID,
		TwitterUserID: twitterUser.ID,
		Status:        1,
		Notes:         req.Notes,
	}
	if err := h.monitorRepo.Create(ctx, monitor); err != nil {
		respondError(w, 500, "failed to create monitor")
		return
	}

	// Increment refCount and ensure monitorStatus=1
	_ = h.twitterUserRepo.UpdateRefCount(ctx, twitterUser.TwitterID, 1)
	if twitterUser.MonitorStatus != 1 {
		_ = h.twitterUserRepo.UpdateMonitorStatus(ctx, twitterUser.TwitterID, 1)
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"id":            monitor.ID.Hex(),
		"twitterUserId": twitterUser.TwitterID,
		"username":      twitterUser.Username,
		"status":        1,
		"notes":         req.Notes,
		"profile": map[string]interface{}{
			"displayName": twitterUser.Profile.DisplayName,
			"avatar":      twitterUser.Profile.Avatar,
			"bio":         twitterUser.Profile.Bio,
			"verified":    twitterUser.Profile.Verified,
		},
		"stats": map[string]interface{}{
			"followersCount": twitterUser.Stats.FollowersCount,
			"followingCount": twitterUser.Stats.FollowingCount,
			"tweetsCount":    twitterUser.Stats.TweetsCount,
		},
		"ct": formatTime(monitor.CT),
	})
}

// ========== 5. DELETE /monitors/:id ==========

func (h *Handler) DeleteMonitor(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()

	idStr := r.Header.Get("X-Path-ID")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}

	monitor, err := h.monitorRepo.GetByID(ctx, id)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if monitor == nil || monitor.UserID != userID {
		respondError(w, 404, "monitor not found")
		return
	}

	// Get the associated twitter user to update refCount
	twitterUser, err := h.twitterUserRepo.GetByID(ctx, monitor.TwitterUserID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	if err := h.monitorRepo.DeleteByID(ctx, id); err != nil {
		respondError(w, 500, "failed to delete monitor")
		return
	}

	// Decrement refCount
	if twitterUser != nil {
		_ = h.twitterUserRepo.UpdateRefCount(ctx, twitterUser.TwitterID, -1)
		if twitterUser.RefCount <= 1 {
			_ = h.twitterUserRepo.UpdateMonitorStatus(ctx, twitterUser.TwitterID, -1)
		}
	}

	respondJSON(w, 200, "success", nil)
}

// ========== 6. PUT /monitors/:id ==========

func (h *Handler) UpdateMonitor(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()

	idStr := r.Header.Get("X-Path-ID")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondError(w, 400, "invalid id")
		return
	}

	var req struct {
		Status *int    `json:"status"`
		Notes  *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	if req.Status != nil && *req.Status != 1 && *req.Status != -1 {
		respondError(w, 400, "invalid status, must be 1 or -1")
		return
	}

	// Verify ownership
	existing, err := h.monitorRepo.GetByID(ctx, id)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	if existing == nil || existing.UserID != userID {
		respondError(w, 404, "monitor not found")
		return
	}

	updated, err := h.monitorRepo.UpdateFields(ctx, id, req.Status, req.Notes)
	if err != nil {
		respondError(w, 500, "failed to update monitor")
		return
	}
	if updated == nil {
		respondError(w, 404, "monitor not found")
		return
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"id":     updated.ID.Hex(),
		"status": updated.Status,
		"notes":  updated.Notes,
		"ut":     formatTime(updated.UT),
	})
}

// ========== 7. GET /tweets/feed ==========

func (h *Handler) GetTweetsFeed(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()
	page, limit := parsePagination(r)

	// Get all monitored twitter user IDs for this user
	twitterUserIDs, err := h.monitorRepo.ListTwitterUserIDsByUser(ctx, userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Build filters
	filter := data.TweetFeedFilter{}
	if v := r.URL.Query().Get("twitterUserId"); v != "" {
		filter.TwitterID = v
	}
	if v := r.URL.Query().Get("aiStatus"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			filter.AIStatus = &i
		}
	}
	if v := r.URL.Query().Get("type"); v != "" {
		filter.Type = v
	}
	if v := r.URL.Query().Get("startDate"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, shanghaiLoc); err == nil {
			filter.StartDate = &t
		}
	}
	if v := r.URL.Query().Get("endDate"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, shanghaiLoc); err == nil {
			filter.EndDate = &t
		}
	}

	tweets, total, err := h.tweetRepo.ListFeedPaginated(ctx, twitterUserIDs, filter, page, limit)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Batch lookup authors
	authorIDSet := make(map[primitive.ObjectID]struct{})
	for _, t := range tweets {
		authorIDSet[t.TwitterUserID] = struct{}{}
	}
	authorIDs := make([]primitive.ObjectID, 0, len(authorIDSet))
	for id := range authorIDSet {
		authorIDs = append(authorIDs, id)
	}
	authors, err := h.twitterUserRepo.GetByIDs(ctx, authorIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	list := make([]interface{}, 0, len(tweets))
	for _, t := range tweets {
		item := map[string]interface{}{
			"id":            t.ID.Hex(),
			"tweetId":       t.TweetID,
			"twitterUserId": t.TwitterID,
			"twitterId":     t.TwitterID,
			"url":           t.URL,
			"text":          t.Text,
			"type":          t.Type,
			"media":         buildMedia(t.Media),
			"metrics": map[string]interface{}{
				"retweetCount": t.Metrics.RetweetCount,
				"replyCount":   t.Metrics.ReplyCount,
				"likeCount":    t.Metrics.LikeCount,
				"viewCount":    t.Metrics.ViewCount,
			},
			"publishedAt":  formatTime(t.PublishedAt),
			"fetchedAt":    formatTime(t.FetchedAt),
			"aiStatus":     t.AIStatus,
			"aiAnalyzedAt": formatTimePtr(t.AIAnalyzedAt),
		}

		if t.AISuggestions != nil {
			item["aiSuggestions"] = map[string]interface{}{
				"score":   t.AISuggestions.Score,
				"summary": t.AISuggestions.Summary,
				"suggestion": map[string]interface{}{
					"type":    t.AISuggestions.Suggestion.Type,
					"content": t.AISuggestions.Suggestion.Content,
					"reason":  t.AISuggestions.Suggestion.Reason,
				},
			}
		} else {
			item["aiSuggestions"] = nil
		}

		if author, ok := authors[t.TwitterUserID]; ok {
			item["author"] = map[string]interface{}{
				"username": author.Username,
				"profile": map[string]interface{}{
					"displayName": author.Profile.DisplayName,
					"avatar":      author.Profile.Avatar,
				},
				"stats": map[string]interface{}{
					"followersCount": author.Stats.FollowersCount,
				},
			}
		} else {
			item["author"] = nil
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

// ========== 8. PUT /settings/dingtalk ==========

func (h *Handler) UpdateDingTalk(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()

	var req struct {
		DingTalkWebhook *string `json:"dingtalkWebhook"`
		DingTalk        *bool   `json:"dingtalk"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, 400, "invalid request body")
		return
	}

	if req.DingTalkWebhook != nil && *req.DingTalkWebhook != "" {
		if !strings.HasPrefix(*req.DingTalkWebhook, "https://oapi.dingtalk.com/") {
			respondError(w, 400, "invalid webhook url")
			return
		}
	}

	if err := h.userRepo.UpdateDingTalk(ctx, userID, req.DingTalkWebhook, req.DingTalk); err != nil {
		respondError(w, 500, "failed to update settings")
		return
	}

	// Re-fetch user to return updated data
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	respondJSON(w, 200, "success", map[string]interface{}{
		"settings": map[string]interface{}{
			"dingtalkWebhook": maskWebhook(user.Settings.DingTalkWebhook),
		},
		"notifications": map[string]interface{}{
			"dingtalk": user.Notifications.DingTalk,
		},
		"ut": formatTime(user.UT),
	})
}

// ========== 9. GET /stats/overview ==========

func (h *Handler) GetStatsOverview(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	ctx := r.Context()

	// Monitor counts
	statusActive := 1
	statusPaused := -1
	totalMonitors, err := h.monitorRepo.CountByUserAndStatus(ctx, userID, nil)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	activeMonitors, err := h.monitorRepo.CountByUserAndStatus(ctx, userID, &statusActive)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}
	pausedMonitors, err := h.monitorRepo.CountByUserAndStatus(ctx, userID, &statusPaused)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Get all monitored twitter user IDs
	twitterUserIDs, err := h.monitorRepo.ListTwitterUserIDsByUser(ctx, userID)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// Tweet stats
	feedStats, err := h.tweetRepo.CountFeedStats(ctx, twitterUserIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	// AI stats
	aiStats, err := h.tweetRepo.AggregateAIStats(ctx, twitterUserIDs)
	if err != nil {
		respondError(w, 500, "internal error")
		return
	}

	avgScore := math.Round(aiStats.AvgScore*10) / 10

	respondJSON(w, 200, "success", map[string]interface{}{
		"monitors": map[string]interface{}{
			"total":  totalMonitors,
			"active": activeMonitors,
			"paused": pausedMonitors,
		},
		"tweets": map[string]interface{}{
			"total":     feedStats.Total,
			"today":     feedStats.Today,
			"pending":   feedStats.Pending,
			"completed": feedStats.Completed,
			"failed":    feedStats.Failed,
		},
		"ai": map[string]interface{}{
			"avgScore":       avgScore,
			"highScoreCount": aiStats.HighScoreCount,
		},
		"dingtalk": map[string]interface{}{
			"todaySent": 0, // TODO: implement dingtalk send tracking
		},
	})
}

// ========== helpers ==========

func parsePagination(r *http.Request) (page, limit int) {
	page = 1
	limit = 20
	if v := r.URL.Query().Get("page"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100
			}
		}
	}
	return
}

func buildMedia(media []data.Media) []map[string]interface{} {
	if len(media) == 0 {
		return []map[string]interface{}{}
	}
	result := make([]map[string]interface{}, len(media))
	for i, m := range media {
		result[i] = map[string]interface{}{
			"type": m.Type,
			"url":  m.URL,
		}
	}
	return result
}
