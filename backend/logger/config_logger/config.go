package config_logger

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

type ConfigLogger struct {
	Level string `yaml:"log_level" env:"LOG_LEVEL" env-default:"prod"`
}

var once sync.Once
var cfg *ConfigLogger

func GetLoggerConf() *ConfigLogger {
	once.Do(func() {
		cfg = &ConfigLogger{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")

		envPath := filepath.Join(configDir, "logger/.env")
		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err != nil {
				log.Printf("⚠️ Failed to load .env: %v", err)
			}
		} else {
			log.Printf("ℹ️ .env file not found at %s, using defaults", envPath)
		}

		if err := cleanenv.ReadConfig(configPath, cfg); err != nil {
			help, _ := cleanenv.GetDescription(cfg, nil)
			log.Printf("❌ Config error: %v\n%s", err, help)
			os.Exit(1)
		}

		if err := cleanenv.ReadEnv(cfg); err != nil {
			log.Printf("⚠️ Env vars warning: %v", err)
		}
	})
	return cfg
}
