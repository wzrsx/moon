package config_geoserver

import (
	"log"
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
}

var (
	once sync.Once
	cfg  *ConfigGeoServer
)

func GetGeoServerConf() *ConfigGeoServer {
	once.Do(func() {
		// Инициализируем глобальную переменную cfg, а не создаем новую локальную
		cfg = &ConfigGeoServer{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")
		envPath := filepath.Join(configDir, "geoserver/.env")

		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err != nil {
				log.Printf("⚠️ Failed to load .env: %v", err)
			}
		} else {
			log.Printf("ℹ️ .env file not found at %s, using defaults", envPath)
		}

		if err := cleanenv.ReadConfig(configPath, cfg); err != nil {
			log.Printf("❌ Config error: %v", err)
		}

		if err := cleanenv.ReadEnv(cfg); err != nil {
			log.Printf("⚠️ Env vars warning: %v", err)
		}

		// Проверка обязательных полей
		if cfg.BaseURL == "" || cfg.Username == "" || cfg.Password == "" {
			log.Fatal("❌ Missing required GeoServer configuration")
		}
	})
	return cfg
}
