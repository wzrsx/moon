package geoserver_init

import (
	"fmt"
	"io"
	"log"
	"loonar_mod/backend/geoserver/config_geoserver"
	"net/http"
	"path/filepath"
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
	if err := g.SetLayerStyle("moon-workspace", "cmps_5deg", "raster-style"); err != nil {
		if !strings.Contains(err.Error(), "exists") {
			return fmt.Errorf("failed to add %s: %w", err)
		}
		log.Printf("failed to add %s: %w", err)
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
	cleanedPath := cleanFilePath(filePath)
	filename := cleanedFilename(cleanedPath)

	// 1. Проверяем существование хранилища
	checkStoreURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s", g.ConfigGeoServer.BaseURL, workspace, storeName)

	_, status, err := g.doRequest("GET", checkStoreURL, nil, "")
	if err != nil && status != http.StatusNotFound && status != http.StatusOK {
		return fmt.Errorf("failed to check store existence: %w (status %d)", err, status)
	}

	// 2. Если хранилища нет - создаём
	if status == http.StatusNotFound {
		createStoreURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores",
			g.ConfigGeoServer.BaseURL, workspace)

		storeXML := fmt.Sprintf(`
        <coverageStore>
            <name>%s</name>
            <workspace>%s</workspace>
            <enabled>true</enabled>
            <type>GeoTIFF</type>
            <url>file:///maps/%s</url>
        </coverageStore>`, storeName, workspace, filename)

		_, status, err = g.doRequest("POST", createStoreURL, strings.NewReader(storeXML), "text/xml")
		if err != nil {
			return fmt.Errorf("failed to create store: %w", err)
		}
		if status != http.StatusCreated {
			return fmt.Errorf("failed to create store (status %d)", status)
		}
		log.Printf("Store %s created successfully", storeName)
	} else {
		log.Printf("Store %s already exists, skipping creation", storeName)
	}

	// 1. Проверяем, существует ли coverage
	checkCoverageURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s/coverages/%s",
		g.ConfigGeoServer.BaseURL, workspace, storeName, layerName)

	_, status, _ = g.doRequest("GET", checkCoverageURL, nil, "")
	if status == http.StatusNotFound {
		// 2. Если coverage нет — создаем
		createCoverageURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s/coverages",
			g.ConfigGeoServer.BaseURL, workspace, storeName)

		coverageXML := fmt.Sprintf(`
		<coverage>
			<name>%s</name>
			<nativeName>%s</nativeName>
			<title>%s</title>
			<nativeCRS>EPSG:100000</nativeCRS>
			<srs>EPSG:4326</srs>
			<projectionPolicy>FORCE_DECLARED</projectionPolicy>
			<enabled>true</enabled>
		</coverage>`, layerName, cleanPostfix(filename), layerName)

		_, status, err = g.doRequest("POST", createCoverageURL, strings.NewReader(coverageXML), "application/xml")
		if err != nil {
			return fmt.Errorf("failed to create coverage: %w", err)
		}
		if status != http.StatusCreated && status != http.StatusOK {
			return fmt.Errorf("failed to create coverage (status %d)", status)
		}
		log.Printf("Coverage %s created successfully", layerName)
	} else if status != http.StatusOK {
		return fmt.Errorf("failed to check coverage existence (status %d)", status)
	}

	// 6. Обновляем параметры coverage (bounding box и т.д.)
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
    </coverage>`, layerName)

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
func cleanFilePath(path string) string {
	return strings.TrimPrefix(path, "file://")
}

func cleanedFilename(path string) string {
	_, filename := filepath.Split(path)
	return filename
}

func cleanPostfix(filename string) string {
	return strings.TrimSuffix(filename, filepath.Ext(filename))
}

func (g *GeoServerClient) SetLayerStyle(workspace, layerName, styleName string) error {
	// 1. First ensure the style exists (create if it doesn't)
	if err := g.createStyleIfNotExists(workspace, styleName, layerName); err != nil {
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

func (g *GeoServerClient) createStyleIfNotExists(workspace, styleName, layerName string) error {
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
                                <ColorMapEntry color="#00FF00" quantity="1"/>
                            </ColorMap>
                        </RasterSymbolizer>
                    </Rule>
                </FeatureTypeStyle>
            </UserStyle>
        </NamedLayer>
    </StyledLayerDescriptor>`, layerName, styleName)

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
