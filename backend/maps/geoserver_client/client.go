package geoserver_client

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"loonar_mod/backend/maps/config_geoserver"
	"net/http"
)

type GeoServerClient struct {
	ConfigGeoServer *config_geoserver.ConfigGeoServer
	Client          *http.Client
}

func NewGeoClient() *GeoServerClient {
	return &GeoServerClient{
		ConfigGeoServer: config_geoserver.GetGeoServerConf(),
		Client:          &http.Client{},
	}
}

func (c *GeoServerClient) createRequest(method, path string, body io.Reader) (*http.Request, error) {
	url := fmt.Sprintf("%s/rest/%s", c.ConfigGeoServer.BaseURL, path)
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", c.ConfigGeoServer.Username, c.ConfigGeoServer.Password)))
	req.Header.Add("Authorization", "Basic "+auth)
	req.Header.Add("Content-Type", "application/xml")

	return req, nil
}

func (c *GeoServerClient) CreateLayer(workspace, store, layerName string, featureTypeXML []byte) error {
	path := fmt.Sprintf("workspaces/%s/datastores/%s/featuretypes", workspace, store)
	req, err := c.createRequest("POST", path, bytes.NewBuffer(featureTypeXML))
	if err != nil {
		return err
	}

	resp, err := c.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to create layer: %s", string(body))
	}

	return nil
}

func CreateFeatureTypeXML(layerName, srs string) []byte {
	return []byte(fmt.Sprintf(`
<featureType>
  <name>%s</name>
  <nativeName>%s</nativeName>
  <title>%s</title>
  <srs>%s</srs>
  <enabled>true</enabled>
</featureType>`, layerName, layerName, layerName, srs))
}

func (c *GeoServerClient) AddFeatures(workspace, store, layerName string, features []byte) error {
	path := fmt.Sprintf("workspaces/%s/datastores/%s/featuretypes/%s", workspace, store, layerName)
	req, err := c.createRequest("PUT", path, bytes.NewBuffer(features))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to add features: %s", string(body))
	}

	return nil
}
