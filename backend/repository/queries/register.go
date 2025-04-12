package queries

import (
	"context"
	"crypto/sha256"
	"encoding/hex"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RegistrationQuery(username string, email string, password string, pool *pgxpool.Pool) (error, string) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err, ""
	}
	defer conn.Release()

	passwordHashed := hashPassword(password)

	var user_id string
	err = conn.QueryRow(context.Background(), "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id_user", username, email, passwordHashed).Scan(&user_id)
	if err != nil {
		return err, ""
	}

	return nil, user_id
}

func hashPassword (password string) string{
	hasher := sha256.New()
	hasher.Write([]byte(password))
	hash := hasher.Sum(nil)
	return hex.EncodeToString(hash)
}
