package jwt_logic

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt"
	"go.uber.org/zap"
)

var jwtSecretKey = []byte("very-secret-key")

func CreateTocken(c *context.Context, username string, user_id string, logger *zap.Logger) (string, error)  {
	payload := jwt.MapClaims{
		"user_id": user_id,
		"usename": username,
		"exp": time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	return token.SignedString(jwtSecretKey)
}
