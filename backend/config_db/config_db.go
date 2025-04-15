package config_db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

type ConfigDB struct {
	HostDB     string `yaml:"db_host" env:"DB_HOST"`
	PortDB     string `yaml:"db_port" env:"DB_PORT"`
	UserDB     string `yaml:"db_user" env:"DB_USER"`
	PasswordDB string `yaml:"db_password" env:"DB_PASSWORD"`
	NameDB     string `yaml:"db_name" env:"DB_NAME"`
	SSLmodeDB  string `yaml:"db_ssl" env:"DB_SSLMODE"`
}

var once sync.Once
var cfg *ConfigDB

func GetDBConf() *ConfigDB {
	once.Do(func() {
		cfg = &ConfigDB{}
		configDir := os.Getenv("CONFIG_DIR")
		if configDir == "" {
			configDir = "backend"
		}

		configPath := filepath.Join(configDir, "config.yml")

		envPath := filepath.Join(configDir, "config_db/.env")
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

func (c *ConfigDB) ConnStr() string {
	log.Println(fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.UserDB, c.PasswordDB, c.HostDB, c.PortDB, c.NameDB, c.SSLmodeDB,
	))
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.UserDB, c.PasswordDB, c.HostDB, c.PortDB, c.NameDB, c.SSLmodeDB,
	)
}
