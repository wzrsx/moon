package handlers_maps

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	jwt_logic "loonar_mod/backend/JWT_logic"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/repository/queries_maps"
	"net/http"
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
func (a *MapsHandlers) CreateMapHandler(rw http.ResponseWriter, r *http.Request){
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
        respondWithJSON(rw, http.StatusInternalServerError, map[string]string{"error": "Map creation failed"})
        return
    }

    // 6. Успешный ответ
    respondWithJSON(rw, http.StatusCreated, map[string]string{
        "map_id":       newMap.MapID,
        "redirect_url": "/maps/redactor?map_id=" + newMap.MapID,
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

    // Перенаправляем на выбор места
	respondWithJSON(rw, http.StatusOK, map[string]string{
        "redirect_url": "/maps/redactor/page",
    })
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
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in tocken"})
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
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error save module: %v", err),
		})
		return
	}
	module.MapId = id_map

	err = module.SaveModule(a.Pool)
	if err != nil {
		a.Logger.Error("Error querying module", zap.Error(err))
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error save module: %v", err),
		})
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"message": "Successfuly saved module",
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
        "message": "Success response",
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
	log.Println(distances)
    
    // Отправляем успешный ответ
    respondWithJSON(rw, http.StatusOK, map[string]interface{}{
        "message": "Success response",
        "requirements_json": distances,
    })
}
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}
