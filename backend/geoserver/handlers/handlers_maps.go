package handlers_maps

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"log"
	"loonar_mod/backend/config_db"
	"loonar_mod/backend/repository/queries_maps"
	"net/http"
	"net/url"
	"strconv"
	"strings"

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

func (a *MapsHandlers) OpenMapsRedactor(rw http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Accept") != "application/json" {
		return
	}
	claims, ok := r.Context().Value("claims").(jwt.MapClaims)
	if !ok {
		a.Logger.Error("No claims in context")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "No claims in context"})
		return
	}

	id_map, ok := claims["map_id"].(string)
	if !ok {
		a.Logger.Error("User ID not found in claims")
		respondWithJSON(rw, http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
		return
	}

	// Возвращаем JSON с ID карты
	respondWithJSON(rw, http.StatusOK, map[string]string{
		"map_id":       id_map,
		"redirect_url": "/maps/redactor/page", // Добавляем URL для редиректа
	})
}

// Отдельный обработчик для рендеринга HTML
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
	type CredentialModulesRequirements struct {
		ModuleType string `json:"module_type"`
	}
	var creds CredentialModulesRequirements

	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error take module requirements: %v", err),
		})
		return
	}
	requirements, err := queries_maps.TakeModulesRequirements(creds.ModuleType, a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Quering take module requirements: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error take module requirements: %v", err),
		})
		return
	}
	log.Println(requirements)
	respondWithJSON(rw, http.StatusAccepted, map[string]interface{}{
		"message":           "Success response",
		"requirements_json": requirements,
	})
}
func (a *MapsHandlers) TakeModulesDistance(rw http.ResponseWriter, r *http.Request) {
	// Определяем структуру для входящего запроса
	type Request struct {
		ModuleType1 string `json:"module_type_1"`
		ModuleType2 string `json:"module_type_2"`
	}

	var req Request

	// Декодируем тело запроса
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		a.Logger.Sugar().Errorf("Error decoding request: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Invalid request format: %v", err),
		})
		return
	}

	// Проверяем обязательные поля
	if req.ModuleType1 == "" || req.ModuleType2 == "" {
		a.Logger.Sugar().Error("Empty module types provided")
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": "Both module_type_1 and module_type_2 are required",
		})
		return
	}

	// Получаем данные о расстоянии
	requirements, err := queries_maps.TakeModulesDistance(req.ModuleType1, req.ModuleType2, a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error getting module distance: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to get module distance: %v", err),
		})
		return
	}
	log.Println(requirements)

	// Отправляем успешный ответ
	respondWithJSON(rw, http.StatusOK, map[string]interface{}{
		"message":           "Success response",
		"requirements_json": requirements,
	})
}
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}

func (a *MapsHandlers) CompositeRender(rw http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	layer := query.Get("LAYERS")
	bbox := query.Get("BBOX")
	widthStr := query.Get("WIDTH")
	heightStr := query.Get("HEIGHT")

	// Валидация параметров
	if layer == "" || bbox == "" || widthStr == "" || heightStr == "" {
		http.Error(rw, "Missing required parameters", http.StatusBadRequest)
		return
	}

	width, _ := strconv.Atoi(widthStr)
	height, _ := strconv.Atoi(heightStr)

	// Определяем какие слои нужно скомбинировать
	layersToRender := a.getLayersToCombine(layer)

	// Создаем базовое изображение
	log.Printf("Запрос: LAYERS=%s, BBOX=%s, WIDTH=%d, HEIGHT=%d",
		layer, bbox, width, height)

	// Создаем базовое изображение с прозрачным фоном
	baseImg := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(baseImg, baseImg.Bounds(),
		image.NewUniform(color.RGBA{0, 0, 0, 0}),
		image.Point{},
		draw.Src)

	// Рендерим каждый слой
	for _, layer := range layersToRender {
		img, err := a.renderWMSSingleLayer(layer.name, bbox, width, height)
		if err != nil {
			log.Printf("Error rendering layer %s: %v", layer.name, err)
			continue
		}

		// Накладываем слой с учетом прозрачности
		a.blendImages(baseImg, img, layer.opacity)
	}

	// Отправляем результат
	rw.Header().Set("Content-Type", "image/png")
	if err := png.Encode(rw, baseImg); err != nil {
		log.Printf("Failed to encode PNG: %v", err)
	}
}

func (a *MapsHandlers) getLayersToCombine(layer string) []struct {
	name    string
	opacity float64
} {
	// Здесь определяем какие слои и с какой прозрачностью комбинировать
	switch layer {
	case "ldem-hill":
		return []struct {
			name    string
			opacity float64
		}{
			{"ldem-83s", 1.0},
			{"ldem-hill", 0.6},
		}
	default:
		return []struct {
			name    string
			opacity float64
		}{
			{layer, 1.0},
		}
	}
}

func (a *MapsHandlers) renderWMSSingleLayer(layer, bbox string, width, height int) (image.Image, error) {
	params := url.Values{}
	params.Add("SERVICE", "WMS")
	params.Add("VERSION", "1.1.1")
	params.Add("REQUEST", "GetMap")
	params.Add("LAYERS", "moon-workspace:"+layer)
	params.Add("BBOX", bbox)
	params.Add("WIDTH", strconv.Itoa(width))
	params.Add("HEIGHT", strconv.Itoa(height))
	params.Add("SRS", "EPSG:100000")
	params.Add("FORMAT", "image/png")
	params.Add("TRANSPARENT", "true")

	resp, err := http.Get("http://geoserver:8080/geoserver/wms?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("ошибка запроса к GeoServer: %v", err)
	}
	defer resp.Body.Close()

	// Читаем первые 512 байт для определения типа контента
	buf := make([]byte, 512)
	n, _ := resp.Body.Read(buf)
	bodyStart := string(buf[:n])

	// Проверяем, не вернул ли GeoServer ошибку
	if strings.Contains(bodyStart, "<ServiceException") ||
		strings.Contains(bodyStart, "<html>") ||
		strings.Contains(bodyStart, "<?xml") {
		return nil, fmt.Errorf("GeoServer error: %s", strings.TrimSpace(bodyStart))
	}

	// Собираем полное тело ответа (первые 512 байт + остаток)
	body := io.MultiReader(bytes.NewReader(buf[:n]), resp.Body)

	img, err := png.Decode(body)
	if err != nil {
		return nil, fmt.Errorf("ошибка декодирования PNG: %v (первые байты: % X)", err, buf[:8])
	}

	return img, nil
}

func (a *MapsHandlers) isImageEmpty(img image.Image) (bool, error) {
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := img.At(x, y).RGBA()
			if a > 0 {
				return false, nil
			}
		}
	}
	return true, nil
}

func (a *MapsHandlers) blendImages(dst *image.RGBA, src image.Image, opacity float64) {
	bounds := dst.Bounds()
	srcBounds := src.Bounds()

	// Проверяем размеры изображений
	if bounds.Dx() != srcBounds.Dx() || bounds.Dy() != srcBounds.Dy() {
		log.Printf("Размеры изображений не совпадают: dst %v, src %v", bounds, srcBounds)
		return
	}

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			srcColor := src.At(x, y)
			dstColor := dst.At(x, y)

			sr, sg, sb, sa := srcColor.RGBA()
			dr, dg, db, da := dstColor.RGBA()

			// Нормализация и применение opacity
			alpha := uint32(opacity * float64(sa))
			invAlpha := 0xffff - alpha

			r := (sr*alpha + dr*invAlpha) / 0xffff
			g := (sg*alpha + dg*invAlpha) / 0xffff
			b := (sb*alpha + db*invAlpha) / 0xffff
			a := sa + da*(0xffff-sa)/0xffff

			dst.SetRGBA64(x, y, color.RGBA64{
				R: uint16(r),
				G: uint16(g),
				B: uint16(b),
				A: uint16(a),
			})
		}
	}
}

// // Функция для наложения слоя с прозрачностью
// func drawLayer(dst *image.RGBA, src image.Image, opacity float64) {
// 	bounds := dst.Bounds()
// 	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
// 		for x := bounds.Min.X; x < bounds.Max.X; x++ {
// 			srcColor := src.At(x, y)
// 			dstColor := dst.At(x, y)

// 			r1, g1, b1, a1 := srcColor.RGBA()
// 			r2, g2, b2, a2 := dstColor.RGBA()

// 			// Смешивание цветов с учетом прозрачности
// 			alpha := uint32(opacity * 0xffff)
// 			r := (r1*alpha + r2*(0xffff-alpha)) / 0xffff
// 			g := (g1*alpha + g2*(0xffff-alpha)) / 0xffff
// 			b := (b1*alpha + b2*(0xffff-alpha)) / 0xffff
// 			a := a1 + a2*(0xffff-a1)/0xffff

// 			dst.Set(x, y, &color.RGBA64{
// 				R: uint16(r),
// 				G: uint16(g),
// 				B: uint16(b),
// 				A: uint16(a),
// 			})
// 		}
// 	}
// }
// func (a *MapsHandlers) getGeoServerImage(layer, bbox string, width, height int) (image.Image, error) {
// 	// Формируем URL запроса к GeoServer
// 	params := url.Values{}
// 	params.Add("service", "WMS")
// 	params.Add("version", "1.1.0")
// 	params.Add("request", "GetMap")
// 	params.Add("layers", layer)
// 	params.Add("bbox", bbox)
// 	params.Add("width", strconv.Itoa(width))
// 	params.Add("height", strconv.Itoa(height))
// 	params.Add("srs", "EPSG:100000")
// 	params.Add("format", "image/png")
// 	params.Add("transparent", "true")

// 	url := "http://localhost:8080/geoserver/wms?" + params.Encode()

// 	// Выполняем HTTP запрос с таймаутом
// 	client := &http.Client{Timeout: 10 * time.Second}
// 	resp, err := client.Get(url)
// 	if err != nil {
// 		return nil, fmt.Errorf("HTTP request failed: %w", err)
// 	}
// 	defer resp.Body.Close()

// 	if resp.StatusCode != http.StatusOK {
// 		return nil, fmt.Errorf("GeoServer returned status %d", resp.StatusCode)
// 	}

// 	// Декодируем PNG изображение
// 	img, err := png.Decode(resp.Body)
// 	if err != nil {
// 		return nil, fmt.Errorf("PNG decode failed: %w", err)
// 	}

// 	// Конвертируем в RGBA если нужно
// 	if _, ok := img.(*image.RGBA); !ok {
// 		rgba := image.NewRGBA(img.Bounds())
// 		draw.Draw(rgba, rgba.Bounds(), img, image.Point{}, draw.Src)
// 		img = rgba
// 	}

// 	return img, nil
// }
