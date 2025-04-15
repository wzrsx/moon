## Этап сборки
#FROM golang:1.24.2-alpine AS builder
#WORKDIR /app-moon
#
#COPY go.mod go.sum ./
#RUN go mod download
#
#COPY ./backend .
#
#RUN apk add --no-cache make
#
#RUN make build
#
## Этап запуска (минимальный образ)
#FROM alpine:3.21
#WORKDIR /app-moon
#
#ENV CONFIG_PATH=config/
#
## Копируем только бинарник из этапа сборки
#COPY --from=builder /app-moon/bin/app-moon .
#
## Копируем конфигурационные файлы
#COPY --from=builder /app-moon/backend/config.yml ${CONFIG_PATH}/
#COPY --from=builder /app-moon/backend/authorization/.env ${CONFIG_PATH}/auth.env
#COPY --from=builder /app-moon/backend/maps/.env ${CONFIG_PATH}/maps.env
#COPY --from=builder /app-moon/backend/config_db/.env ${CONFIG_PATH}/db.env
#
#COPY --from=builder /app/internal/repositories/migrations/ ./migrations/
#
#
#
#
#CMD ["./app-moon"]