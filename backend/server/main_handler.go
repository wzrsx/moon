package server

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
)

func MainHandler(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("web/index.html"))
	if tmpl == nil {
		log.Println("Template not found!")
		respondWithJSON(w, http.StatusInternalServerError, "Could not load template")
		return
	}

	err := tmpl.Execute(w, nil)
	if err != nil {
		respondWithJSON(w, http.StatusInternalServerError, err.Error())
		return
	}
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
