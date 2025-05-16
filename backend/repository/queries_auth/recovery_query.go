package queries_auth

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RecoveryQuery(email, password string, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer conn.Release()

	var exists bool
	err = conn.QueryRow(context.Background(), "UPDATE users SET password = $2 WHERE email = $1 ", email, password).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("email exists")
	}

	return nil
}
