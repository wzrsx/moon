package config_geoserver

import (
	"log"
	"loonar_mod/backend/config_db"
	"os"
	"path/filepath"
	"sync"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

type ConfigGeoServer struct {
	BaseURL  string `yaml:"geoserver_url" env:"GEO_URL" env-default:"http://localhost:8080/geoserver"`
	Username string `yaml:"geoserver_username" env:"GEO_USERNAME"`
	Password string `yaml:"geoserver_password" env:"GEO_PASSWORD"`

	DB *config_db.ConfigDB
}

var once sync.Once
var cfg *ConfigGeoServer

func GetGeoServerConf() *ConfigGeoServer {
	once.Do(func() {
		cfg := &ConfigGeoServer{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")
		envPath := filepath.Join(configDir, "maps/.env")

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
