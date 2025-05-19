package queries_maps

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Map struct {
	UserID     string `json:"user_id"`
	MapID      string `json:"map_id"`
	MapName    string `json:"map_name"`
	MapCreated string `json:"map_created"`
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

	// Проверяем существование карты у этого пользователя
	var existingMapID string
	err = conn.QueryRow(context.Background(),
		"SELECT id FROM maps WHERE user_id = $1 AND name_map = $2",
		user_id, name_map).Scan(&existingMapID)

	if err == nil {
		// Карта уже существует
		return Map{}, fmt.Errorf("Карта с именем '%s' уже существует", name_map)
	} else if err != pgx.ErrNoRows {
		// Произошла другая ошибка при запросе
		return Map{}, fmt.Errorf("Ошибка базы данных: %v", err)
	}

	// Создаем новую карту
	var (
		id_map     string
		created_at time.Time
	)

	err = conn.QueryRow(context.Background(),
		`INSERT INTO maps (user_id, name_map) 
         VALUES ($1, $2) 
         RETURNING id, created_at`,
		user_id, name_map).Scan(&id_map, &created_at)

	if err != nil {
		return Map{}, fmt.Errorf("не удалось создать карту: %v", err)
	}

	return Map{
		UserID:     user_id,
		MapID:      id_map,
		MapName:    name_map,
		MapCreated: created_at.Format(time.RFC3339),
	}, nil
}
func DeleteMap(map_id string, user_id string, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer conn.Release()

	_, err = conn.Exec(context.Background(),
		"DELETE FROM maps WHERE id = $1 AND user_id = $2",
		map_id, user_id)
	if err != nil {
		return err
	}

	return nil
}

func TakeMaps(user_id string, pool *pgxpool.Pool) ([]Map, error) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	// Исправленный запрос:
	rows, err := conn.Query(context.Background(),
		"SELECT id, name_map, created_at FROM maps WHERE user_id = $1",
		user_id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var maps []Map
	for rows.Next() {
		var m Map
		var tempTime time.Time
		if err := rows.Scan(
			&m.MapID,
			&m.MapName,
			&tempTime,
		); err != nil {
			return nil, err
		}
		m.UserID = user_id
		m.MapCreated = tempTime.Format(time.RFC3339)
		maps = append(maps, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return maps, nil
}
func TakeMapName(map_id string, pool *pgxpool.Pool) (string, error) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return "", err
	}
	defer conn.Release()
	var name_map string
	err = conn.QueryRow(context.Background(),
		"SELECT name_map FROM maps WHERE id = $1",
		map_id).Scan(&name_map)
	if err != nil {
		return "", err
	}

	return name_map, nil
}
