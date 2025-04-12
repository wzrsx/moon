package config_auth

import (
	"log"
	"loonar_mod/backend/config_db"
	"os"
	"path/filepath"
	"sync"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

type ConfigAuth struct {
	Sender         string `yaml:"gmail_login" env:"GMAIL_LOGIN"`
	SenderPassword string `yaml:"gmail_password" env:"GMAIL_PASSWORD"`
	SMTP_Host      string `yaml:"smtp_host" env:"SMTP_HOST"`
	SMTP_Port      string `yaml:"smtp_port" env:"SMTP_PORT"`

	DB *config_db.ConfigDB
}

var once sync.Once
var cfg *ConfigAuth

func GetAuthConf(cfg_db *config_db.ConfigDB) *ConfigAuth {
	once.Do(func() {
		cfg := &ConfigAuth{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")

		envPath := filepath.Join(configDir, "authorization/.env")
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

		cfg.DB = cfg_db
	})
	return cfg
}
