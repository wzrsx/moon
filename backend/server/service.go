package server

import (
	"loonar_mod/backend/authorization/config_auth"
	handlers_auth "loonar_mod/backend/authorization/handlers"
	"loonar_mod/backend/config_db"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type MoonServiceSrever struct {
	Pool     *pgxpool.Pool
	Logger   *zap.Logger
	Cfg_auth *config_auth.ConfigAuth
	Cfg_db   *config_db.ConfigDB
}

func CreateMoonServiceSrever(pool *pgxpool.Pool, logger *zap.Logger, cfg_auth *config_auth.ConfigAuth, cfg_db *config_db.ConfigDB) *MoonServiceSrever {
	return &MoonServiceSrever{
		Pool:     pool,
		Logger:   logger,
		Cfg_auth: cfg_auth,
		Cfg_db:   cfg_db,
	}
}

func (s *MoonServiceSrever) AddHandlers() *mux.Router {
	r := mux.NewRouter()

	auth_handlers := handlers_auth.CreateAuthHandlers(s.Cfg_auth, s.Logger, s.Pool)

	r.HandleFunc("/auth/registration", auth_handlers.RegisterHandler).Methods("POST")
	r.HandleFunc("/auth/signin", auth_handlers.SignInHandler).Methods("POST")

	r.HandleFunc("/maps/redactor", auth_handlers.SignInHandler).Methods("POST")
	
	return r
}
