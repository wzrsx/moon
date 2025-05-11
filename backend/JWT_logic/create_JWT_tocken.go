package jwt_logic

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt"
	"go.uber.org/zap"
)

var jwtSecretKey = []byte("very-secret-key")

func CreateTocken(c *context.Context, username string, user_id string, map_id string, logger *zap.Logger) (string, error) {
	payload := jwt.MapClaims{
		"user_id": user_id,
		"usename": username,
		"map_id":  map_id,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	return token.SignedString(jwtSecretKey)
}
func CreateTokenWithMapID(r *http.Request, mapID string) (string, error) {
    // Получаем текущие claims из контекста
    claims, ok := r.Context().Value("claims").(jwt.MapClaims)
    if !ok {
        return "", errors.New("no claims in context")
    }

    // Создаем копию claims, чтобы не изменять оригинал
    newClaims := jwt.MapClaims{}
    for key, val := range claims {
        newClaims[key] = val
    }

    // Обновляем map_id и срок действия токена
    newClaims["map_id"] = mapID
    newClaims["exp"] = time.Now().Add(time.Hour * 72).Unix() // Обновляем срок действия

    // Создаем новый токен
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
    return token.SignedString(jwtSecretKey)
}