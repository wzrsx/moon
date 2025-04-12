package new_repository

import (
	"context"
	"log"
	"loonar_mod/backend/config_db"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool_conections struct {
	PoolConns *pgxpool.Pool
}

func Create_pool() (*Pool_conections, error) {
	conf_DB := config_db.GetDBConf() // Tafing data from configDB.go
	var p Pool_conections

	config, err := pgxpool.ParseConfig(conf_DB.ConnStr())
	if err != nil {
		return nil, err
	}
	config.MaxConns = 10 // Устанавливаем максимальное число соединений в пуле

	p.PoolConns, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	err = p.PoolConns.Ping(context.Background())
	if err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}

	log.Println("pool conections sucsessfuly setted")
	return &p, nil
}
