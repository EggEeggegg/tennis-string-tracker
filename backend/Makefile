.PHONY: run build migrate seed tidy lint

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

# Run DB migrations (requires psql and DATABASE_URL in env)
migrate:
	psql "$(DATABASE_URL)" -f migrations/001_init.sql

# Seed admin user (username: admin, password: admin123)
seed:
	go run ./cmd/seed

tidy:
	go mod tidy

# Install golangci-lint then run it
lint:
	golangci-lint run ./...
