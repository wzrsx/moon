package server

import (
	jwt_logic "loonar_mod/backend/JWT_logic"
	"loonar_mod/backend/authorization/config_auth"
	handlers_auth "loonar_mod/backend/authorization/handlers"
	"loonar_mod/backend/config_db"
	handlers_maps "loonar_mod/backend/geoserver/handlers"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type MoonServiceServer struct {
	Pool     *pgxpool.Pool
	Logger   *zap.Logger
	Cfg_auth *config_auth.ConfigAuth
	Cfg_db   *config_db.ConfigDB
}

func CreateMoonServiceServer(pool *pgxpool.Pool, logger *zap.Logger, cfg_auth *config_auth.ConfigAuth, cfg_db *config_db.ConfigDB) *MoonServiceServer {
	return &MoonServiceServer{
		Pool:     pool,
		Logger:   logger,
		Cfg_auth: cfg_auth,
		Cfg_db:   cfg_db,
	}
}

func (s *MoonServiceServer) AddHandlers() *mux.Router {
	r := mux.NewRouter()

	auth_handlers := handlers_auth.CreateAuthHandlers(s.Cfg_auth, s.Logger, s.Pool)
	maps_handlers := handlers_maps.CreateMapsHandlers(s.Cfg_db, s.Logger, s.Pool)

	r.HandleFunc("/", MainHandler).Methods("GET")
	r.HandleFunc("/auth/registration", auth_handlers.RegisterHandler).Methods("POST")
	r.HandleFunc("/auth/check_code", auth_handlers.CheckCodeHandler).Methods("POST")
	r.HandleFunc("/auth/signin", auth_handlers.SignInHandler).Methods("POST")

	r.Handle("/maps/redactor", jwt_logic.JWTMiddleware(http.HandlerFunc(maps_handlers.OpenMapsRedactor))).Methods("GET")
	r.Handle("/maps/redactor/page", jwt_logic.JWTMiddleware(http.HandlerFunc(maps_handlers.RenderMapRedactor))).Methods("GET")
	r.Handle("/maps/redactor/page/take_modules", jwt_logic.JWTMiddleware(http.HandlerFunc(maps_handlers.TakeModules))).Methods("GET")
	r.Handle("/maps/redactor/page/save_module", jwt_logic.JWTMiddleware(http.HandlerFunc(maps_handlers.SaveModule))).Methods("POST")
	r.Handle("/maps/redactor/page/take_modules_requirements", jwt_logic.JWTMiddleware(http.HandlerFunc(maps_handlers.TakeModulesRequirements))).Methods("POST")

	// Статические файлы (если Nginx не обрабатывает)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/",
		http.FileServer(http.Dir("./web"))))

	return r
}
