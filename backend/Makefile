.PHONY: run build migrate seed tidy lint

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

# Run all DB migrations in order
migrate:
	go run ./cmd/migrate

# Seed admin user (username: admin, password: admin123)
seed:
	go run ./cmd/seed

tidy:
	go mod tidy

# Install golangci-lint then run it
lint:
	golangci-lint run ./...
