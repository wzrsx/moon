package handlers_maps

import (
	"encoding/json"
	"fmt"
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
	type CredentialsOpenRedactor struct {
		IdMap string `json:"idMap"`
	}
	var creds CredentialsOpenRedactor
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Error("Error decoding credentials open redactor", zap.Error(err))
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error query to open redactor: %v", err),
		})
		return
	}
	modules, err := queries_maps.TakeModules(creds.IdMap, a.Pool)
	if err != nil {
		a.Logger.Error("Error querying modules open redactor", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to open redactor: %v", err),
		})
		return
	}

}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
