package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	CORSOrigin  string
	GinMode     string
}

func Load() *Config {
	// Load .env if present (ignored in production where env vars are set directly)
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL: mustEnv("DATABASE_URL"),
		JWTSecret:   mustEnv("JWT_SECRET"),
		Port:        getEnv("PORT", "8080"),
		CORSOrigin:  getEnv("CORS_ORIGIN", "http://localhost:3000"),
		GinMode:     getEnv("GIN_MODE", "release"),
	}

	return cfg
}

func mustEnv(key string) string {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
