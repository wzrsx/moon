package main

import (
	"context"
	"go.uber.org/zap"
	"loonar_mod/backend/authorization/config_auth"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/geoserver/config_geoserver"
	logg "loonar_mod/backend/logger"
	"loonar_mod/backend/logger/config_logger"
	"loonar_mod/backend/repository/new_repository"
	"loonar_mod/backend/server"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	cfg_db := config_db.GetDBConf()
	cfg_auth := config_auth.GetAuthConf(cfg_db)
	cfg_logger := config_logger.GetLoggerConf()
	cfg_geoserver := config_geoserver.GetGeoServerConf()

	logger := logg.InitLogger(cfg_logger)
	logg.SyncLogger(logger)

	pool, err := new_repository.Create_pool()
	if err != nil {
		logger.Sugar().Errorf("Error database init: %v", err)
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	var srv *http.Server
	go func() {
		srv = server.StartServe(pool.PoolConns, logger, cfg_auth, cfg_db, cfg_geoserver)
	}()

	<-done
	logger.Fatal("Server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server shutdown failed", zap.Error(err))
	}
}
