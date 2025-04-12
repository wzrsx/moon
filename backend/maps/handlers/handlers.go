package handlers_maps

import (
	"loonar_mod/backend/config_db"
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

}
