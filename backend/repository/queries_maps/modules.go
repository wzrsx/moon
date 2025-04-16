package queries_maps

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Module struct {
	IdModule   string    `json:"id_module"`
	MapId      string    `json:"id_map"`
	ModuleType string    `json:"module_type"`
	ModuleName string    `json:"module_name"`
	Points     []float64 `json:"points"`
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
		"SELECT id, module_type, module_name, module_points_json FROM modules WHERE map_id = $1",
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
			&module.ModuleType,
			&module.ModuleName,
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
		"INSERT INTO modules (map_id, module_type, module_name, module_points_json) VALUES ($1, $2, $3, $4)",
		m.MapId, m.ModuleType, m.ModuleName, pointsJSON)
	if err != nil {
		return err
	}

	return nil
}
