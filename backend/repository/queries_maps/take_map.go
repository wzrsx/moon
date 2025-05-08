package queries_maps

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)
type Map struct{
	UserID 				string `json:"user_id"`
	MapID 				string `json:"map_id"`
	MapName 			string `json:"map_name"`
	MapCreated 			string `json:"map_created"`
}
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
		"SELECT id FROM maps WHERE user_id = $1", user_id).Scan(&id_map)

	if err != nil {
		// Если ошибка - не потому что запись не найдена
		if err != pgx.ErrNoRows {
			return "", fmt.Errorf("database query error: %v", err)
		}

		// Создаем новую карту, если не найдена
		err = conn.QueryRow(context.Background(),
			`INSERT INTO maps (user_id) 
             VALUES ($1) 
             RETURNING id`,
			user_id).Scan(&id_map)

		if err != nil {
			return "", fmt.Errorf("failed to create new map: %v", err)
		}
	}

	return id_map, nil
}
func CreateMap(user_id string, name_map string, pool *pgxpool.Pool) (Map, error) {
    conn, err := pool.Acquire(context.Background())
    if err != nil {
        return Map{}, err
    }
    defer conn.Release()

    var (
        id_map    string
        created_at time.Time
    )

    // Проверяем существование карты
    err = conn.QueryRow(context.Background(),
        "SELECT id, created_at FROM maps WHERE name_map = $1", name_map).Scan(&id_map, &created_at)
    
    if err != nil {
        if err != pgx.ErrNoRows {
            return Map{}, fmt.Errorf("database query error: %v", err)
        }
        
        // Создаем новую карту если не найдена
        err = conn.QueryRow(context.Background(),
            `INSERT INTO maps (user_id, name_map) 
             VALUES ($1, $2) 
             RETURNING id, created_at`,
            user_id, name_map).Scan(&id_map, &created_at)
        
        if err != nil {
            return Map{}, fmt.Errorf("failed to create new map: %v", err)
        }
    }

    // Возвращаем структуру Map
    return Map{
        UserID:     user_id,
        MapID:      id_map,
        MapName:    name_map,
        MapCreated: created_at.Format(time.RFC3339),
    }, nil
}