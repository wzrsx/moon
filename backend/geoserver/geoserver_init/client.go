package geoserver_init

import (
	"fmt"
	"io"
	"log"
	"loonar_mod/backend/geoserver/config_geoserver"
	"net/http"
	"strings"
)

type GeoServerClient struct {
	ConfigGeoServer *config_geoserver.ConfigGeoServer
	Client          *http.Client
}

func NewGeoClient(cfg *config_geoserver.ConfigGeoServer) *GeoServerClient {
	return &GeoServerClient{
		ConfigGeoServer: cfg,
		Client:          &http.Client{},
	}
}

func (g *GeoServerClient) GeoserverInit() error {
	//1. Создаем workspace (если не существует)
	if err := g.createWorkspaceWithRetry("moon-workspace"); err != nil {
		return fmt.Errorf("workspace creation failed: %w", err)
	}

	// 2. Добавляем все карты, создавая для каждой отдельное хранилище
	maps := []struct {
		name string
		path string
	}{
		{"ldem-83s", "file:///maps/LDEM_83S_10MPP_ADJ.tiff"},
		{"ldem-hill", "file:///maps/LDEM_83S_10MPP_ADJ_HILL.tiff"},
		{"ldsm-83s", "file:///maps/LDSM_83S_10MPP_ADJ.tiff"},
		{"cmps_5deg", "file:///maps/compress_5deg.tif"},
		{"cmps_15deg", "file:///maps/compress_15deg.tif"},
	}

	log.Println(maps)

	for _, m := range maps {
		storeName := fmt.Sprintf("%s-store", m.name)
		if err := g.CreateAndPublishGeoTIFFLayer("moon-workspace", storeName, m.name, m.path); err != nil {
			if !strings.Contains(err.Error(), "exists") {
				return fmt.Errorf("failed to add %s: %w", m.name, err)
			}
			log.Printf("failed to add %s: %w", m.name, err)
		}
	}

	// 3. Устанавливаем стиль
	// Для слоя cmps_5deg
	if err := g.SetLayerStyle("moon-workspace", "cmps_5deg", "raster-style", "#00FF00"); err != nil {
		if !strings.Contains(err.Error(), "exists") {
			return fmt.Errorf("failed to set style for cmps_5deg: %w", err)
		}
		log.Printf("Style already exists for cmps_5deg: %v", err)
	}

	// Для слоя cmps_15deg
	if err := g.SetLayerStyle("moon-workspace", "cmps_15deg", "raster-style-dark", "#00AA00"); err != nil {
		if !strings.Contains(err.Error(), "exists") {
			return fmt.Errorf("failed to set style for cmps_15deg: %w", err)
		}
		log.Printf("Style already exists for cmps_15deg: %v", err)
	}

	return nil
}

func (g *GeoServerClient) doRequest(method, url string, body io.Reader, contentType string) ([]byte, int, error) {
	log.Printf("Making request to %s %s", method, url)

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, 0, fmt.Errorf("request creation error: %w", err)
	}

	req.SetBasicAuth(g.ConfigGeoServer.Username, g.ConfigGeoServer.Password)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := g.Client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("request execution error: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("Warning: error closing response body: %v", err)
		}
	}()

	// Читаем тело ответа, игнорируя EOF ошибки
	data, readErr := io.ReadAll(resp.Body)

	// Если получили EOF - проверяем статус код
	if readErr == io.ErrUnexpectedEOF {
		if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusBadRequest {
			log.Printf("Got EOF but status is %d, considering successful", resp.StatusCode)
			return nil, resp.StatusCode, nil
		}
		return nil, resp.StatusCode, fmt.Errorf("unexpected EOF with status %d", resp.StatusCode)
	}

	if readErr != nil {
		return nil, resp.StatusCode, fmt.Errorf("response reading error: %w", readErr)
	}

	log.Printf("Response status: %d, body length: %d", resp.StatusCode, len(data))
	return data, resp.StatusCode, nil
}

func (g *GeoServerClient) createWorkspaceWithRetry(name string) error {
	// First check if workspace exists
	url := fmt.Sprintf("%s/rest/workspaces/%s", g.ConfigGeoServer.BaseURL, name)
	_, status, err := g.doRequest("GET", url, nil, "")

	// If exists, return success
	if status == http.StatusOK {
		log.Printf("Workspace %s already exists", name)
		return nil
	}

	// If not found (404), create it
	if status == http.StatusNotFound {
		url = fmt.Sprintf("%s/rest/workspaces", g.ConfigGeoServer.BaseURL)
		body := fmt.Sprintf(`<workspace><name>%s</name></workspace>`, name)

		_, status, err = g.doRequest("POST", url, strings.NewReader(body), "application/xml")
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}

		if status != http.StatusCreated {
			return fmt.Errorf("unexpected status code: %d", status)
		}

		log.Printf("Workspace %s created successfully", name)
		return nil
	}

	// Handle other status codes
	if err != nil {
		return fmt.Errorf("workspace check failed: %w", err)
	}
	return fmt.Errorf("unexpected status code: %d", status)
}

func (g *GeoServerClient) CreateAndPublishGeoTIFFLayer(workspace, storeName, layerName, filePath string) error {
	// 1. Проверяем существование хранилища
	checkStoreURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s",
		g.ConfigGeoServer.BaseURL, workspace, storeName)

	_, status, err := g.doRequest("GET", checkStoreURL, nil, "")
	if err != nil && status != http.StatusNotFound {
		return fmt.Errorf("failed to check store existence: %w", err)
	}
	if status == http.StatusOK {
		return fmt.Errorf("Coverage exists: %w", err)
	}

	// Если хранилище не существует, создаем его
	if status == http.StatusNotFound {
		createStoreURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores",
			g.ConfigGeoServer.BaseURL, workspace)

		storeXML := fmt.Sprintf(`
        <coverageStore>
            <name>%s</name>
            <workspace>%s</workspace>
            <enabled>true</enabled>
            <type>GeoTIFF</type>
        </coverageStore>`, storeName, workspace)

		_, status, err = g.doRequest("POST", createStoreURL, strings.NewReader(storeXML), "application/xml")
		if err != nil {
			return fmt.Errorf("failed to create store: %w", err)
		}
		if status != http.StatusCreated {
			return fmt.Errorf("failed to create store (status %d)", status)
		}
		log.Printf("Store %s created successfully", storeName)
	}

	// 2. Загружаем файл как внешний ресурс
	uploadURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s/external.geotiff?configure=first&coverageName=%s",
		g.ConfigGeoServer.BaseURL, workspace, storeName, layerName)

	_, status, err = g.doRequest("PUT", uploadURL, strings.NewReader(filePath), "text/plain")
	if err != nil {
		if strings.Contains(err.Error(), "EOF") && status == http.StatusOK {
			log.Printf("Geotiff %s likely created (got EOF)", layerName)
		} else {
			return fmt.Errorf("failed to upload GeoTIFF: %w (status %d)", err, status)
		}
	} else if status != http.StatusCreated {
		return fmt.Errorf("failed to upload GeoTIFF (status %d)", status)
	}

	// 3. Обновляем coverage с правильными параметрами CRS и bbox
	updateCoverageURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s/coverages/%s",
		g.ConfigGeoServer.BaseURL, workspace, storeName, layerName)

	coverageXML := fmt.Sprintf(`
    <coverage>
        <name>%s</name>
        <nativeCRS>EPSG:100000</nativeCRS>
        <srs>EPSG:100000</srs>
        <nativeBoundingBox>
            <minx>-216400</minx>
            <maxx>216400</maxx>
            <miny>-216400</miny>
            <maxy>216400</maxy>
            <crs>EPSG:100000</crs>
        </nativeBoundingBox>
        <latLonBoundingBox>
            <minx>-216400</minx>
            <maxx>216400</maxx>
            <miny>-216400</miny>
            <maxy>216400</maxy>
            <crs>EPSG:4326</crs>
        </latLonBoundingBox>
        <projectionPolicy>FORCE_DECLARED</projectionPolicy>
		<enabled>true</enabled>
		<metadata>
            <entry key="cachingEnabled">false</entry>
            <entry key="dirName">%s_%s</entry>
        </metadata>
    </coverage>`, layerName, workspace, layerName)

	_, status, err = g.doRequest("PUT", updateCoverageURL, strings.NewReader(coverageXML), "application/xml")
	if err != nil {
		return fmt.Errorf("failed to update coverage: %w", err)
	}
	if status != http.StatusOK {
		return fmt.Errorf("failed to update coverage (status %d)", status)
	}

	log.Printf("Layer %s published successfully in store %s", layerName, storeName)
	return nil
}

func (g *GeoServerClient) SetLayerStyle(workspace, layerName, styleName, color string) error {
	// 1. First ensure the style exists (create if it doesn't)
	if err := g.createStyleIfNotExists(workspace, styleName, layerName, color); err != nil {
		return fmt.Errorf("failed to ensure style exists: %w", err)
	}

	// 2. Assign the style to the layer
	url := fmt.Sprintf("%s/rest/layers/%s:%s", g.ConfigGeoServer.BaseURL, workspace, layerName)
	body := fmt.Sprintf(`
    <layer>
        <defaultStyle>
            <name>%s</name>
            <workspace>%s</workspace>
        </defaultStyle>
    </layer>`, styleName, workspace)

	_, status, err := g.doRequest("PUT", url, strings.NewReader(body), "application/xml")
	if err != nil {
		return fmt.Errorf("failed to set style: %w", err)
	}
	if status != http.StatusOK {
		return fmt.Errorf("failed to set style (status %d)", status)
	}

	log.Printf("Style %s successfully assigned to layer %s in workspace %s", styleName, layerName, workspace)
	return nil
}

func (g *GeoServerClient) createStyleIfNotExists(workspace, styleName, layerName, color string) error {
	// Check if style exists
	checkStyleURL := fmt.Sprintf("%s/rest/workspaces/%s/styles/%s",
		g.ConfigGeoServer.BaseURL, workspace, styleName)

	_, status, err := g.doRequest("GET", checkStyleURL, nil, "")
	if err != nil && status != http.StatusNotFound {
		return fmt.Errorf("failed to check style existence: %w (status %d)", err, status)
	}

	// If style exists, return
	if status == http.StatusOK {
		log.Printf("Style %s already exists in workspace %s", styleName, workspace)
		return nil
	}

	// Create the style since it doesn't exist
	styleXML := fmt.Sprintf(`
    <style>
        <name>%s</name>
        <filename>%s.sld</filename>
    </style>`, styleName, styleName)

	createStyleURL := fmt.Sprintf("%s/rest/workspaces/%s/styles",
		g.ConfigGeoServer.BaseURL, workspace)

	// First create the style resource
	_, status, err = g.doRequest("POST", createStyleURL, strings.NewReader(styleXML), "application/xml")
	if err != nil {
		return fmt.Errorf("failed to create style resource: %w", err)
	}
	if status != http.StatusCreated && status != http.StatusOK {
		return fmt.Errorf("failed to create style resource (status %d)", status)
	}

	// Now upload the SLD content
	sldContent := fmt.Sprintf(`
    <StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
        <NamedLayer><Name>%s</Name>
            <UserStyle><Title>%s</Title>
                <FeatureTypeStyle>
                    <Rule>
                        <RasterSymbolizer>
                            <ColorMap>
                                <ColorMapEntry color="#000000" quantity="0"/>
                                <ColorMapEntry color="%s" quantity="1"/>
                            </ColorMap>
                        </RasterSymbolizer>
                    </Rule>
                </FeatureTypeStyle>
            </UserStyle>
        </NamedLayer>
    </StyledLayerDescriptor>`, layerName, styleName, color)

	uploadStyleURL := fmt.Sprintf("%s/rest/workspaces/%s/styles/%s",
		g.ConfigGeoServer.BaseURL, workspace, styleName)

	_, status, err = g.doRequest("PUT", uploadStyleURL, strings.NewReader(sldContent), "application/vnd.ogc.sld+xml")
	if err != nil {
		return fmt.Errorf("failed to upload style content: %w", err)
	}
	if status != http.StatusOK {
		return fmt.Errorf("failed to upload style content (status %d)", status)
	}

	log.Printf("Style %s created successfully in workspace %s", styleName, workspace)
	return nil
}
