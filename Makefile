GOBIN = $(shell go env COPATH)/bin

.PHONY: all build run

all: build run

build:
	@echo "Building binary..."
	go build -o bin/server ./backend/cmd/moon_app
	@echo "Binary built."
run:
	@echo "Go server is running..."
	./bin/server