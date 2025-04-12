package server

import (
	"loonar_mod/backend/authorization/config_auth"
	"loonar_mod/backend/config_db"
	config_server "loonar_mod/backend/server/config_server"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func StartServe(pool *pgxpool.Pool, logger *zap.Logger, cfg_auth *config_auth.ConfigAuth, cfg_db *config_db.ConfigDB) error {
	cfg_server := config_server.GetServerConf()
	service := CreateMoonServiceSrever(pool, logger, cfg_auth, cfg_db)
	router := service.AddHandlers()

	srv := &http.Server{
		Handler:      router,
		Addr:         cfg_server.Host + ":" + cfg_server.Port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}
	err := srv.ListenAndServe()
	if err != nil {
		return err
	}
	return nil
}
