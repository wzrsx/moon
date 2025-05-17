package server

import (
	"loonar_mod/backend/authorization/config_auth"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/geoserver/config_geoserver"
	config_server "loonar_mod/backend/server/config_server"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

func StartServe(pool *pgxpool.Pool, logger *zap.Logger, cfg_auth *config_auth.ConfigAuth, cfg_db *config_db.ConfigDB, cfg_geoserver *config_geoserver.ConfigGeoServer) *http.Server {
	cfg_server := config_server.GetServerConf()
	service := CreateMoonServiceServer(pool, logger, cfg_auth, cfg_db)
	router := service.AddHandlers()

	// geo_client := geoserver_init.NewGeoClient(cfg_geoserver)
	// err := geo_client.GeoserverInit()
	// if err != nil {
	// 	logger.Fatal("geoserver_init", zap.Error(err))
	// }

	logger.Info("Server config",
		zap.String("host", cfg_server.Host),
		zap.String("port", cfg_server.Port))

	srv := &http.Server{
		Handler:      router,
		Addr:         cfg_server.Host + ":" + cfg_server.Port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	logger.Info("Starting server", zap.String("address", srv.Addr))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("Server failed", zap.Error(err))
	}
	return srv
}
