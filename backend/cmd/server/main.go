package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tennis-tracker/internal/config"
	"tennis-tracker/internal/database"
	"tennis-tracker/internal/router"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	if sqlDB, err := db.DB(); err == nil {
		defer sqlDB.Close()
	}

	r := router.New(cfg, db)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background
	go func() {
		log.Printf("server: listening on :%s (mode=%s)", cfg.Port, cfg.GinMode)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: listen error: %v", err)
		}
	}()

	// Wait for SIGINT or SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("server: shutting down gracefully …")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server: forced shutdown: %v", err)
	}
	log.Println("server: stopped")
}
