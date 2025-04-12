package queries

import (
	"context"
	"errors"

	"github.com/jackc/pgx"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthorizeData struct {
	Username string
	UserID   string
}

func AuthorizeQuery(email string, password string, pool *pgxpool.Pool) (error, *AuthorizeData) {
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		return err, nil
	}
	defer conn.Release()
	//проверка есть ли email в бд
	var count int
	errCheckEmail := conn.QueryRow(context.Background(), "SELECT count(*) FROM users WHERE email = $1", email).Scan(&count)
	if errCheckEmail != nil {
		return errCheckEmail, nil
	}
	if count == 0 {
		return errors.New("email not found"), nil
	}

	password_hashed := hashPassword(password)
	var username string
	var id_user string

	err = conn.QueryRow(context.Background(), "SELECT id_user, username FROM users WHERE email = $1 AND password = $2 ", email, password_hashed).Scan(&id_user, &username)
	if err != nil {
		if err == pgx.ErrNoRows {
			return errors.New("pass invalid"), nil
		}
		return err, nil
	}
	return nil, &AuthorizeData{
		Username: username,
		UserID:   id_user,
	}
}
