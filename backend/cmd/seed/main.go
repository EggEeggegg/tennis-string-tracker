// cmd/seed/main.go — creates the default admin user.
// Run: make seed  OR  go run ./cmd/seed
package main

import (
	"fmt"
	"log"
	"os"

	"tennis-tracker/internal/config"
	"tennis-tracker/internal/database"
	"tennis-tracker/internal/model"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()

	cfg := config.Load()
	db := database.Connect(cfg.DatabaseURL)
	if sqlDB, err := db.DB(); err == nil {
		defer sqlDB.Close()
	}

	username := mustEnv("ADMIN_USERNAME")
	password := mustEnv("ADMIN_PASSWORD")
	name := mustEnv("ADMIN_NAME")
	const role = "admin"

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Fatalf("seed: failed to hash password: %v", err)
	}

	var user model.User
	result := db.Where(model.User{Username: username}).Assign(model.User{
		Password: string(hashed),
		Name:     name,
		Role:     model.UserRole(role),
	}).FirstOrCreate(&user)

	if result.Error != nil {
		log.Fatalf("seed: failed to upsert admin: %v", result.Error)
	}

	fmt.Printf("seed: admin user ready (id=%s  username=%s  password=%s)\n", user.ID, username, password)
}

func mustEnv(key string) string {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}
