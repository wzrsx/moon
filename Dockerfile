# Этап сборки
FROM golang:1.24.2-alpine AS builder
WORKDIR /app-moon

COPY go.mod go.sum ./
RUN go mod download

COPY ./backend /app-moon/backend
COPY ./Makefile /app-moon/Makefile

RUN apk add --no-cache make

RUN make build

# Этап запуска (минимальный образ)
FROM alpine:3.21
WORKDIR /app-moon

ENV CONFIG_PATH=config

# Копируем только бинарник и статику
COPY --from=builder /app-moon/bin/moon_app .
COPY ./web ./web

# Создаем структуру директорий для конфигов
RUN mkdir -p ${CONFIG_PATH}/authorization \
    && mkdir -p ${CONFIG_PATH}/config_db \
    && mkdir -p ${CONFIG_PATH}/logger \
    && mkdir -p ${CONFIG_PATH}/geoserver \
    && mkdir -p ${CONFIG_PATH}/server \
    && mkdir -p migrations

# Копируем конфигурационные файлы
COPY --from=builder /app-moon/backend/config.yml ${CONFIG_PATH}/
COPY --from=builder /app-moon/backend/authorization/.env ${CONFIG_PATH}/authorization/
COPY --from=builder /app-moon/backend/config_db/.env ${CONFIG_PATH}/config_db/
COPY --from=builder /app-moon/backend/geoserver/.env ${CONFIG_PATH}/geoserver/
COPY --from=builder /app-moon/backend/logger/.env ${CONFIG_PATH}/logger/
COPY --from=builder /app-moon/backend/server/.env ${CONFIG_PATH}/server/

COPY --from=builder /app-moon/backend/repository/migrations/ migrations/

ENV CONFIG_DIR="config"
ENV DB_PORT="5432"
ENV DB_HOST="moon-db"
ENV GEO_URL="http://geoserver:8080/geoserver"
ENV HTTP_HOST="0.0.0.0"


CMD ["./moon_app"]