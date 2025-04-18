package handlers_maps

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/repository/queries_maps"
	"net/http"

	"github.com/golang-jwt/jwt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type MapsHandlers struct {
	ConfigAuth *config_db.ConfigDB
	Logger     *zap.Logger
	Pool       *pgxpool.Pool
}

func CreateMapsHandlers(cfg_db *config_db.ConfigDB, logger *zap.Logger, pool *pgxpool.Pool) *MapsHandlers {
	return &MapsHandlers{
		ConfigAuth: cfg_db,
		Logger:     logger,
		Pool:       pool,
	}
}

func (a *MapsHandlers) OpenMapsRedactor(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}

	// Возвращаем JSON с ID карты
	respondWithJSON(rw, http.StatusOK, map[string]string{
		"map_id":       id_map,
		"redirect_url": "/geoserver/redactor", // Добавляем URL для редиректа
	})
}

// Отдельный обработчик для рендеринга HTML
func (a *MapsHandlers) RenderMapRedactor(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}

	tmpl := template.Must(template.ParseFiles("web/pages/building.html"))
	err := tmpl.Execute(rw, id_map)
	if err != nil {
		a.Logger.Error("Template error geoserver editor", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Template error geoserver editor"})
		return
	}
}

func (a *MapsHandlers) TakeModules(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in tocken"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found"})
		return
	}

	modules, err := queries_maps.TakeModules(id_map, a.Pool)
	if err != nil {
		a.Logger.Error("Error querying modules", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to open redactor: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, modules)
}

func (a *MapsHandlers) SaveModule(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in tocken"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found"})
		return
	}

	module := queries_maps.NewModule()
	err := json.NewDecoder(r.Body).Decode(&module)

	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error save module: %v", err),
		})
		return
	}
	module.MapId = id_map

	err = module.SaveModule(a.Pool)
	if err != nil {
		a.Logger.Error("Error querying module", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error save module: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"message": "Successfuly saved module",
	})
}
func (a *MapsHandlers) TakeModulesRequirements(rw http.ResponseWriter, r *http.Request) {
	type CredentialModulesRequirements struct {
		ModuleType string `json:"module_type"`
	}
	var creds CredentialModulesRequirements

	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error take module requirements: %v", err),
		})
		return
	}
	requirements, err := queries_maps.TakeModulesRequirements(creds.ModuleType, a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Quering take module requirements: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error take module requirements: %v", err),
		})
		return
	}
	log.Println(requirements)
	respondWithJSON(rw, http.StatusAccepted, map[string]interface{}{
		"message":   "Success response",
		"requirements_json": requirements,
	})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
