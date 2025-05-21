package handlers_maps

import (
	"encoding/json"
	"fmt"
	"html/template"
	jwt_logic "loonar_mod/backend/JWT_logic"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/repository/queries_maps"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type MapsHandlers struct {
	ConfigAuth *config_db.ConfigDB
	Logger     *zap.Logger
	Pool       *pgxpool.Pool
}

func CreateMapsHandlers(cfg_db *config_db.ConfigDB, logger *zap.Logger, pool *pgxpool.Pool) *MapsHandlers {
	return &MapsHandlers{
		ConfigAuth: cfg_db,
		Logger:     logger,
		Pool:       pool,
	}
}
func (a *MapsHandlers) CreateMapHandler(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}
	var request struct {
		Name string `json:"name_map"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.Logger.Error("Invalid request body:", zap.Error(err))
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
		return
	}
	newMap, err := queries_maps.CreateMap(userID, request.Name, a.Pool)
	if err != nil {
		a.Logger.Error("Failed to create map:", zap.Error(err))

		// Проверяем, содержит ли ошибка сообщение о существующей карте
		if strings.Contains(err.Error(), "уже существует") {
			respondWithJSON(rw, http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		} else {
			respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
				"error": "Ошибка при создании карты",
			})
		}
		return
	}

	// 6. Успешный ответ
	respondWithJSON(rw, http.StatusCreated, map[string]string{
		"map_id":       newMap.MapID,
		"redirect_url": "/maps/redactor?map_id=" + newMap.MapID + "?is_first_launch=true",
	})
}
func (a *MapsHandlers) OpenMapsRedactor(rw http.ResponseWriter, r *http.Request) {
	// Получаем ID карты из query параметров, а не из JWT
	id_map := r.URL.Query().Get("map_id")
	if id_map == "" {
		a.Logger.Error("Map ID not provided")
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{"error": "Map ID is required"})
		return
	}
	isFirstLaunch := r.URL.Query().Get("is_first_launch")
	firstLaunch := isFirstLaunch == "true"
	// Создаем новый JWT с map_id или обновляем существующий
	tokenString, err := jwt_logic.CreateTokenWithMapID(r, id_map)
	if err != nil {
		a.Logger.Error("Failed to create token", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Failed to create token"})
		return
	}

	// Устанавливаем токен в куки
	http.SetCookie(rw, &http.Cookie{
		Name:     "jwt_token",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, //для http
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Now().Add(time.Hour * 72), // Явно устанавливаем срок действия
	})

	// Перенаправляем на выбор места или сразу карту
	if firstLaunch {
		respondWithJSON(rw, http.StatusOK, map[string]interface{}{
			"redirect_url": "/maps/redactor/page",
		})
	} else {
		respondWithJSON(rw, http.StatusOK, map[string]interface{}{
			"redirect_url": "/maps/redactor/page/map",
		})
	}
}
func (a *MapsHandlers) RenderMapRedactor(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}

	tmpl := template.Must(template.ParseFiles("web/pages/building.html"))
	err := tmpl.Execute(rw, id_map)
	if err != nil {
		a.Logger.Error("Template error geoserver editor", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Template error geoserver editor"})
		return
	}
}
func (a *MapsHandlers) TakeMaps(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in tocken"})
		return
	}

	id_user, ok := claims["user_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}

	maps, err := queries_maps.TakeMaps(id_user, a.Pool)
	if err != nil {
		a.Logger.Error("Error querying maps", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to get maps: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, maps)
}

// Отдельный обработчик для рендеринга HTML
func (a *MapsHandlers) RenderChoosePlace(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found"})
		return
	}

	tmpl := template.Must(template.ParseFiles("web/pages/choose_place.html"))
	err := tmpl.Execute(rw, id_map)
	if err != nil {
		a.Logger.Error("Template error", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Template error"})
		return
	}
}

func (a *MapsHandlers) TakeModules(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in tocken"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found"})
		return
	}

	modules, err := queries_maps.TakeModules(id_map, a.Pool)
	if err != nil {
		a.Logger.Error("Error querying modules", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to open redactor: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, modules)
}

func (a *MapsHandlers) SaveModule(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in token"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found"})
		return
	}

	module := queries_maps.NewModule()
	err := json.NewDecoder(r.Body).Decode(&module)
	if err != nil {
		a.Logger.Sugar().Errorf("Error decoding module data: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error saving module: %v", err),
		})
		return
	}

	module.MapId = id_map

	moduleID, err := module.SaveModule(a.Pool)
	if err != nil {
		a.Logger.Error("Error saving module to DB", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error saving module: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]interface{}{
		"message":   "Successfully saved module",
		"module_id": moduleID,
	})
}
func (a *MapsHandlers) TakeModulesRequirements(rw http.ResponseWriter, r *http.Request) {
	// Получаем данные о расстоянии
	requirements, err := queries_maps.TakeModulesRequirements(a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error getting modules requirements: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to get modules requirements: %v", err),
		})
		return
	}

	// Отправляем успешный ответ
	respondWithJSON(rw, http.StatusOK, map[string]interface{}{
		"message":           "Success response",
		"requirements_json": requirements,
	})

}
func (a *MapsHandlers) TakeModulesDistance(rw http.ResponseWriter, r *http.Request) {
	// Получаем данные о расстоянии
	distances, err := queries_maps.TakeModulesDistance(a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error getting module distance: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to get module distance: %v", err),
		})
		return
	}

	// Отправляем успешный ответ
	respondWithJSON(rw, http.StatusOK, map[string]interface{}{
		"message":           "Success response",
		"requirements_json": distances,
	})
}
func (a *MapsHandlers) ClearMapToken(rw http.ResponseWriter, r *http.Request) {
	// Генерируем новый токен без map_id
	tokenString, err := jwt_logic.CreateTokenWithoutMapID(r)
	if err != nil {
		a.Logger.Error("Failed to create cleared token", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Failed to clear map token"})
		return
	}

	// Устанавливаем новый токен в куки
	http.SetCookie(rw, &http.Cookie{
		Name:     "jwt_token",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, //для http
		SameSite: http.SameSiteStrictMode,
	})
	respondWithJSON(rw, http.StatusOK, map[string]interface{}{
		"message": "Success exit",
	})
}
func (a *MapsHandlers) DeleteModuleFromMap(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok || id_map == "" {
		a.Logger.Error("Map ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Map ID not found in token"})
		return
	}

	var request struct {
		IDModule string `json:"id_module"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.Logger.Error("Invalid request body:", zap.Error(err))
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
		return
	}

	err := queries_maps.DeleteModule(request.IDModule, a.Pool)
	if err != nil {
		a.Logger.Error("Failed to delete module:", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Failed to delete module"})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "Module deleted successfully",
	})
}
func (a *MapsHandlers) DeleteMapHandler(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}
	id_user, ok := claims["user_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}
	var request struct {
		IDMap string `json:"map_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.Logger.Error("Invalid request body:", zap.Error(err))
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
		return
	}

	err := queries_maps.DeleteMap(request.IDMap, id_user, a.Pool)
	if err != nil {
		a.Logger.Error("Failed to delete module:", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Failed to delete module"})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "Map deleted successfully",
	})
}

func (a *MapsHandlers) GetNameMapFromJWT(rw http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}
	map_id, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("map_id not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "map_id not found"})
		return
	}

	name_map, err := queries_maps.TakeMapName(map_id, a.Pool)
	if err != nil {
		a.Logger.Error("Failed to take name module:", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Failed to take name module"})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"name_map": name_map,
		"status":  "success",
		"message": "Map taked name successfully",
	})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
