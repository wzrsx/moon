package server

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"

	"github.com/golang-jwt/jwt"
)

func MainHandler(w http.ResponseWriter, r *http.Request) {
	// Загружаем шаблон
	tmpl, err := template.ParseFiles("web/index.html")
	if err != nil {
		log.Printf("Error loading template: %v", err)
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Template error"})
		return
	}

	// Инициализируем данные для шаблона
	type PgData struct {
		Username string
	}
	data := PgData{}
	// Получаем JWT токен из куки
	cookie, err := r.Cookie("jwt_token")
	if err == nil {
		// Парсим токен
		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			return []byte("very-secret-key"), nil
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if username, ok := claims["username"].(string); ok {
					data.Username = username
				}
			}
		} else {
			log.Printf("Invalid token: %v", err)
		}
	}
	// Рендерим шаблон с данными
	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Template execution error: %v", err)
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Error rendering template"})
	}
}
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
