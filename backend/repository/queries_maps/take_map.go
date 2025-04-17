package queries_maps

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TakeMap(user_id string, pool *pgxpool.Pool) (string, error) {
	// Получаем соединение из пула
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to acquire connection: %v", err)
	}
	defer conn.Release()

	// Проверяем существование карты
	var id_map string
	err = conn.QueryRow(context.Background(),
		"SELECT id FROM geoserver WHERE user_id = $1", user_id).Scan(&id_map)

	if err != nil {
		// Если ошибка - не потому что запись не найдена
		if err != pgx.ErrNoRows {
			return "", fmt.Errorf("database query error: %v", err)
		}

		// Создаем новую карту, если не найдена
		err = conn.QueryRow(context.Background(),
			`INSERT INTO geoserver (user_id) 
             VALUES ($1) 
             RETURNING id`,
			user_id).Scan(&id_map)

		if err != nil {
			return "", fmt.Errorf("failed to create new map: %v", err)
		}
	}

	return id_map, nil
}
