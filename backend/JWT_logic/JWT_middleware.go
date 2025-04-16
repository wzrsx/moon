package jwt_logic

import (
	"context"
	"net/http"
	"strings"
)

func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("jwt_token")
		var tokenString string

		if err == nil {
			tokenString = cookie.Value
		} else {
			// Если нет в куках, пробуем из заголовка
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Redirect(w, r, "/", http.StatusSeeOther)
				return
			}
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
		// Проверяем токен
		claims, err := GetClaims(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Добавляем claims в контекст запроса
		ctx := context.WithValue(r.Context(), "claims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
