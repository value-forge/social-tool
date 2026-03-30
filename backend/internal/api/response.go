package api

import (
	"encoding/json"
	"net/http"
	"time"
)

var shanghaiLoc *time.Location

func init() {
	var err error
	shanghaiLoc, err = time.LoadLocation("Asia/Shanghai")
	if err != nil {
		shanghaiLoc = time.FixedZone("CST", 8*3600)
	}
}

// apiResponse is the standard API response envelope
type apiResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func respondJSON(w http.ResponseWriter, code int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(apiResponse{
		Code:    code,
		Message: message,
		Data:    data,
	})
}

func respondError(w http.ResponseWriter, code int, message string) {
	httpStatus := http.StatusOK
	switch code {
	case 401:
		httpStatus = http.StatusUnauthorized
	case 404:
		httpStatus = http.StatusNotFound
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(apiResponse{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

func formatTime(t time.Time) string {
	return t.In(shanghaiLoc).Format(time.RFC3339)
}

func formatTimePtr(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return formatTime(*t)
}

func maskWebhook(url string) string {
	if len(url) == 0 {
		return ""
	}
	const prefix = "access_token="
	idx := len(url)
	for i := 0; i+len(prefix) <= len(url); i++ {
		if url[i:i+len(prefix)] == prefix {
			idx = i + len(prefix)
			break
		}
	}
	if idx >= len(url) {
		return url
	}
	token := url[idx:]
	if len(token) <= 8 {
		return url
	}
	return url[:idx] + token[:4] + "..." + token[len(token)-4:]
}
