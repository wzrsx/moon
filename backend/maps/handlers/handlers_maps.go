package handlers_maps

import (
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/repository/queries_maps"
	"net/http"

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
	userID, ok := claims["user_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return
	}
	id_map, err := queries_maps.TakeMap(userID, a.Pool)
	if err != nil {
		a.Logger.Error("Take map error", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "error query take map: " + err.Error()})
		return
	}
	respondWithJSON(rw, http.StatusOK, map[string]string{"message": "successfully take map",
		"id_map": id_map})
}
func (a *MapsHandlers) TakeModules(rw http.ResponseWriter, r *http.Request) {
	type CredentialsTakeModules struct {
		IdMap string `json:"id_map"`
	}
	var creds CredentialsTakeModules
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Error("Take module error", zap.Error(err))
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{"error": "Take module error: " + err.Error()})
		return
	}

	modules, err := queries_maps.TakeModules(creds.IdMap, a.Pool)
	if err != nil {
		a.Logger.Error("Error querying modules", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to open redactor: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, modules)
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
