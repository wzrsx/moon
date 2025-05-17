package queries_maps

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Module struct {
	IdModule   string    `json:"id_module"`
	MapId      string    `json:"id_map"`
	HabitationType string    `json:"habitation_type"`
	ModuleType string    `json:"module_type"`
	Points     []float64 `json:"points"`
}
type ModulesRequirements struct {
	ModuleType                string `json:"module_type"`
	ModuleName                string `json:"module_name"`
	MaxSlopeDegrees           int    `json:"max_slope_degrees"`
	WidthMeters               int    `json:"width_meters"`
	LengthMeters              int    `json:"length_meters"`
	Description               string `json:"description"`
}
type ModulesDistance struct {
	ModuleType1 string `json:"module_type1"`
	ModuleType2 string `json:"module_type2"`
	MinDistance 		*int `json:"min_distance,omitempty"`
	MaxDistance 		*int `json:"max_distance,omitempty"`
}

func NewModule() *Module {
	return &Module{}
}

func TakeModules(idMap string, pool *pgxpool.Pool) ([]Module, error) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	// Исправленный запрос:
	rows, err := conn.Query(context.Background(),
		"SELECT id, habitation_type, module_type, module_points_json FROM modules WHERE map_id = $1",
		idMap)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []Module
	for rows.Next() {
		var module Module
		var pointsJSON []byte

		// Правильное сканирование:
		if err := rows.Scan(
			&module.IdModule,
			&module.HabitationType,
			&module.ModuleType,
			&pointsJSON,
		); err != nil {
			return nil, err
		}

		// Декодирование JSON
		var jsonData struct {
			Points []float64 `json:"points"`
		}
		if err := json.Unmarshal(pointsJSON, &jsonData); err != nil {
			return nil, err
		}
		module.Points = jsonData.Points

		modules = append(modules, module)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return modules, nil
}
func  DeleteModule(module_id string, pool *pgxpool.Pool) error {

	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer conn.Release()

	_, err = conn.Exec(context.Background(),
		"DELETE FROM modules WHERE id = $1",
		module_id)
	if err != nil {
		return err
	}

	return nil
}
func TakeModulesRequirements(pool *pgxpool.Pool) ([]ModulesRequirements, error) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	rows, err := conn.Query(context.Background(),
		`SELECT 
			module_type, 
			module_name,
			max_slope_degrees, 
			width_meters, 
			length_meters,
			description
		FROM module_requirements`)
	if err != nil{
		return nil, err
	}
	defer rows.Close()
	var req []ModulesRequirements
	for rows.Next() {
		var module ModulesRequirements
		err = rows.Scan(&module.ModuleType, &module.ModuleName, &module.MaxSlopeDegrees, &module.WidthMeters, &module.LengthMeters, &module.Description)
		if err != nil{
			return nil, err
		}
		req = append(req, module)
	}

	if err != nil {
		return nil, err
	}

	return req, nil
}
func (m *Module) SaveModule(pool *pgxpool.Pool) error {
	// Всегда сохраняем в формате {"points": [...]}
	pointsData := struct {
		Points []float64 `json:"points"`
	}{
		Points: m.Points,
	}

	pointsJSON, err := json.Marshal(pointsData)
	if err != nil {
		return err
	}

	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer conn.Release()

	_, err = conn.Exec(context.Background(),
		"INSERT INTO modules (map_id, habitation_type, module_type, module_points_json) VALUES ($1, $2, $3, $4)",
		m.MapId, m.HabitationType, m.ModuleType, pointsJSON)
	if err != nil {
		return err
	}

	return nil
}
func TakeModulesDistance(pool *pgxpool.Pool) ([]ModulesDistance, error) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	rows, err := conn.Query(context.Background(),
		`SELECT module_type_1, module_type_2, min_distance, max_distance FROM module_distance_rules`)
	if err != nil{
		return nil, err
	}
	defer rows.Close()
	var resp []ModulesDistance
	for rows.Next() {
		var module ModulesDistance
		err = rows.Scan(&module.ModuleType1, &module.ModuleType2, &module.MinDistance, &module.MaxDistance)
		if err != nil{
			return nil, err
		}
		resp = append(resp, module)
	}
	if err != nil {
		return nil, err
	}

	return resp, nil
}
