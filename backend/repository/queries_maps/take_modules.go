package queries_maps

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Module struct {
	IdModule    string    `json:"id_module"`
	Module_type string `json:"module_type"`
	Module_name string    `json:"module_name"`
	Points      []float64 `json:"points"`
}

func TakeModules(id_map string, pool *pgxpool.Pool) ([]Module, error) {
	pool.Acquire(context.Background())
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(context.Background(), "SELECT id, module_name, module_json FROM maps WHERE id = $1)", id_map)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []Module
	for rows.Next() {
		var module Module
		var pointsJSON []byte
		rows.Scan(&module.IdModule, &module.Module_name, &pointsJSON)

		err := json.Unmarshal(pointsJSON, &module.Points)
		if err != nil {
			return nil, err
		}
		modules = append(modules, module)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return modules, nil
}
