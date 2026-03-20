package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID          string `json:"user_id"`
	TwitterUsername string `json:"twitter_username"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secret          []byte
	accessDuration  time.Duration
	refreshDuration time.Duration
}

func NewJWTManager(secret string) *JWTManager {
	return &JWTManager{
		secret:          []byte(secret),
		accessDuration:  2 * time.Hour,
		refreshDuration: 7 * 24 * time.Hour,
	}
}

func (m *JWTManager) GenerateAccessToken(userID, twitterUsername string) (string, error) {
	claims := &Claims{
		UserID:          userID,
		TwitterUsername: twitterUsername,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *JWTManager) GenerateRefreshToken(userID, twitterUsername string) (string, error) {
	claims := &Claims{
		UserID:          userID,
		TwitterUsername: twitterUsername,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.refreshDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *JWTManager) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}
