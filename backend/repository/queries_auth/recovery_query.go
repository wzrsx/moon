package queries_auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RecoveryQuery(email, password string, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	// Сначала проверяем существование пользователя
	var userExists bool
	err = conn.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&userExists)
	if err != nil {
		return fmt.Errorf("failed to check user existence: %w", err)
	}

	if !userExists {
		return errors.New("user with this email does not exist")
	}
	passwordHashed := hashPassword(password)

	// Обновляем пароль
	result, err := conn.Exec(context.Background(),
		"UPDATE users SET password = $2 WHERE email = $1",
		email, passwordHashed)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Проверяем, что действительно обновили запись
	if result.RowsAffected() == 0 {
		return errors.New("no rows were updated")
	}

	return nil
}
