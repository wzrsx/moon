package main

import (
	"loonar_mod/backend/authorization/config_auth"
	"loonar_mod/backend/config_db"
	logg "loonar_mod/backend/logger"
	"loonar_mod/backend/logger/config_logger"
	"loonar_mod/backend/repository/new_repository"
	"loonar_mod/backend/server"
)

func main() {
	cfg_db := config_db.GetDBConf()
	cfg_auth := config_auth.GetAuthConf(cfg_db)
	cfg_logger := config_logger.GetLoggerConf()

	logger := logg.InitLogger(cfg_logger)

	pool, err := new_repository.Create_pool()
	if err != nil {
		logger.Sugar().Errorf("Error database init: %v", err)
	}

	server.StartServe(pool.PoolConns, logger, cfg_auth, cfg_db)
}
