// cmd/migrate/main.go — runs all SQL migration files in order.
// Run: go run ./cmd/migrate  OR  task migrate
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("migrate: failed to connect: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("migrate: failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	files, err := filepath.Glob("migrations/*.sql")
	if err != nil || len(files) == 0 {
		log.Fatal("migrate: no migration files found in migrations/")
	}
	sort.Strings(files)

	for _, f := range files {
		sql, err := os.ReadFile(f)
		if err != nil {
			log.Fatalf("migrate: failed to read %s: %v", f, err)
		}
		fmt.Printf("Running %s...\n", f)
		if _, err := sqlDB.Exec(string(sql)); err != nil {
			log.Fatalf("migrate: failed to run %s: %v", f, err)
		}
		fmt.Println("  OK")
	}

	fmt.Println("All migrations applied successfully.")
}
