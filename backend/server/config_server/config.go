package configserver

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

type ConfigServer struct {
	Host string `yaml:"http_host" env:"HTTP_HOST" env-default:"prod"`
	Port string `yaml:"http_port" env:"HTTP_PORT" env-default:"prod"`
}

var once sync.Once
var cfg *ConfigServer

func GetServerConf() *ConfigServer {
	once.Do(func() {
		cfg = &ConfigServer{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")

		envPath := filepath.Join(configDir, "server/.env")
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
