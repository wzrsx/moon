package queries_maps

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TakeMap(user_id string, pool *pgxpool.Pool) (string, error) {
	pool.Acquire(context.Background())
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return "", err
	}
	var id_map string
	err = conn.QueryRow(context.Background(), "SELECT id FROM maps WHERE user_id = $1)", user_id).Scan(&id_map)
	if err != nil {
		return "", err
	}

	return id_map, nil
}
