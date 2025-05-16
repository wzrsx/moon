package server

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"

	"github.com/golang-jwt/jwt"
)

func MainHandler(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("web/index.html"))

	// Получаем JWT токен из куки
	cookie, err := r.Cookie("jwt_token")
	var username string

	if err != nil {
		// Парсим токен и извлекаем имя пользователя
		log.Printf("cookie haven't username")
		err = tmpl.Execute(w, nil)
		if err != nil {
			respondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Error templating html"})
			return
		}
	}
	token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
		return []byte("your-secret-key"), nil
	})

	if err == nil && token.Valid {
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			username = claims["username"].(string)
		}
	}
	// Создаем данные для шаблона
	data := struct {
		Username string
	}{
		Username: username,
	}

	err = tmpl.Execute(w, data)
	if err != nil {
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Error templating html"})
		return
	}
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
