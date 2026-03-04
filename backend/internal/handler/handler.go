package handler

import (
	"tennis-tracker/internal/config"

	"gorm.io/gorm"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	db  *gorm.DB
	cfg *config.Config
}

// New creates a Handler.
func New(db *gorm.DB, cfg *config.Config) *Handler {
	return &Handler{db: db, cfg: cfg}
}
