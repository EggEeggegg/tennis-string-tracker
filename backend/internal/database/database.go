package database

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a GORM connection to PostgreSQL and verifies connectivity.
func Connect(dsn string) *gorm.DB {
	// Show SQL logs in non-release mode (useful while learning GORM)
	logLevel := logger.Silent
	if os.Getenv("GIN_MODE") != "release" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:  logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time { return time.Now().UTC() },
		// Schema is managed by migrations/001_init.sql — don't let GORM create constraints
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatalf("database: failed to open: %v", err)
	}

	// Tune the underlying sql.DB connection pool
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("database: failed to get sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("database: ping failed: %v", err)
	}

	log.Println("database: connected (GORM + postgres driver)")
	return db
}
