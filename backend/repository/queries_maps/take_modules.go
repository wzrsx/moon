package queries_maps

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Module struct {
	IdModule    string
	Module_name string    `json:"module_name"`
	Points      []float64 `json:"points"`
}

func TakeModules(id_user string, pool *pgxpool.Pool) ([]Module, error) {
	pool.Acquire(context.Background())
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(context.Background(), "SELECT id, module_name, module_json FROM (SELECT * FROM maps WHERE user_id = $1)", id_user)
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
