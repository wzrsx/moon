package logger

import (
	"loonar_mod/backend/logger/config_logger"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func InitLogger(cfg *config_logger.ConfigLogger) *zap.Logger {
	var logger *zap.Logger
	var err error

	logLevel := zapcore.InfoLevel
	switch cfg.Level {
	case "debug":
		logLevel = zapcore.DebugLevel
	case "warn":
		logLevel = zapcore.WarnLevel
	case "error":
		logLevel = zapcore.ErrorLevel
	}

	if cfg.Level == "prod" {
		prodConfig := zap.NewProductionConfig()
		prodConfig.Level = zap.NewAtomicLevelAt(logLevel)
		logger, err = prodConfig.Build()
	} else {
		devConfig := zap.NewDevelopmentConfig()
		devConfig.Level = zap.NewAtomicLevelAt(logLevel)
		devConfig.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		logger, err = devConfig.Build()
	}

	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}

	logger = logger.With(
		zap.String("service", "auth-service"),
	)

	zap.ReplaceGlobals(logger)

	return logger
}

func SyncLogger(logger *zap.Logger) {
	_ = logger.Sync()
}
