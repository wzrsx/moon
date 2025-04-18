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
	// 1. Создаем workspace (если не существует)
	if err := g.createWorkspaceWithRetry("moon-workspace"); err != nil {
		return fmt.Errorf("workspace creation failed: %w", err)
	}

	// 2. Добавляем все карты, создавая для каждой отдельное хранилище
	maps := []struct {
		name string
		path string
	}{
		{"ldem-83s", "file:/maps/LDEM_83S_10MPP_ADJ.tiff"},
		{"ldem-hill", "file:/maps/LDEM_83S_10MPP_ADJ_HILL.tiff"},
		{"ldsm-83s", "file:/maps/LDSM_83S_10MPP_ADJ.tiff"},
		{"cmps_5deg", "file:/maps/compress_5deg.tif"},
	}

	for _, m := range maps {
		storeName := fmt.Sprintf("%s-store", m.name)
		if err := g.CreateAndPublishGeoTIFFLayer("moon-workspace", storeName, m.name, m.path); err != nil {
			return fmt.Errorf("failed to add %s: %w", m.name, err)
		}
	}

	// 3. Устанавливаем стиль
	if err := g.SetLayerStyle("moon-workspace", "cmps_5deg", "raster-style"); err != nil {
		return err
	}

	return nil
}

func (g *GeoServerClient) doRequest(method, url string, body io.Reader, contentType string) ([]byte, int, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, 0, err
	}

	req.SetBasicAuth(g.ConfigGeoServer.Username, g.ConfigGeoServer.Password)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := g.Client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

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
	// 1. Сначала создаем хранилище
	createStoreURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores",
		g.ConfigGeoServer.BaseURL, workspace)

	storeXML := fmt.Sprintf(`
    <coverageStore>
        <name>%s</name>
        <workspace>%s</workspace>
        <enabled>true</enabled>
        <type>GeoTIFF</type>
    </coverageStore>`, storeName, workspace)

	_, status, err := g.doRequest("POST", createStoreURL, strings.NewReader(storeXML), "application/xml")
	if err != nil {
		return fmt.Errorf("failed to create store: %w", err)
	}
	if status != http.StatusCreated {
		return fmt.Errorf("failed to create store (status %d)", status)
	}

	// 2. Затем загружаем файл как внешний ресурс
	uploadURL := fmt.Sprintf("%s/rest/workspaces/%s/coveragestores/%s/external.geotiff?configure=first&coverageName=%s",
		g.ConfigGeoServer.BaseURL, workspace, storeName, layerName)

	// Убедитесь, что filePath является абсолютным путем или правильным URI
	// Например: "file:/data/maps/LDEM_83S_10MPP_ADJ.tiff"
	_, status, err = g.doRequest("PUT", uploadURL, strings.NewReader(filePath), "text/plain")
	if err != nil {
		return fmt.Errorf("failed to upload GeoTIFF: %w", err)
	}
	if status != http.StatusOK {
		return fmt.Errorf("failed to upload GeoTIFF (status %d)", status)
	}

	log.Printf("Layer %s published successfully in store %s", layerName, storeName)
	return nil
}

func (g *GeoServerClient) SetLayerStyle(workspace, layerName, styleName string) error {
	// 1. Создаем стиль
	styleXML := fmt.Sprintf(`
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

	url := fmt.Sprintf("%s/rest/workspaces/%s/styles", g.ConfigGeoServer.BaseURL, workspace)
	_, status, err := g.doRequest("POST", url, strings.NewReader(styleXML), "application/vnd.ogc.sld+xml")
	if err != nil {
		return fmt.Errorf("failed to create style: %w", err)
	}

	if status != http.StatusCreated && status != http.StatusConflict {
		return fmt.Errorf("failed to create style (status %d)", status)
	}

	// 2. Назначаем стиль слою
	url = fmt.Sprintf("%s/rest/layers/%s:%s", g.ConfigGeoServer.BaseURL, workspace, layerName)
	body := fmt.Sprintf(`
	<layer>
		<defaultStyle>
			<name>%s</name>
			<workspace>%s</workspace>
		</defaultStyle>
	</layer>`, styleName, workspace)

	_, status, err = g.doRequest("PUT", url, strings.NewReader(body), "application/xml")
	if err != nil {
		return fmt.Errorf("failed to set style: %w", err)
	}

	if status != http.StatusOK {
		return fmt.Errorf("failed to set style (status %d)", status)
	}

	log.Printf("Style %s set for layer %s", styleName, layerName)
	return nil
}
