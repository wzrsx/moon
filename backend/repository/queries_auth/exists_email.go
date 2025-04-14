package queries_auth

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ExistsEmail(email string, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer conn.Release()

	var exists bool
	err = conn.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("email exists")
	}

	return nil
}
