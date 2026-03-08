package router

import (
	"net/http"
	"time"

	"tennis-tracker/internal/config"
	"tennis-tracker/internal/handler"
	"tennis-tracker/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// New builds and returns the configured Gin engine.
func New(cfg *config.Config, db *gorm.DB) *gin.Engine {
	gin.SetMode(cfg.GinMode)

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Global rate limit: 100 requests/min per IP (covers all /api/* routes)
	r.Use(middleware.RateLimit(100, time.Minute))

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	h := handler.New(db, cfg)
	auth := middleware.Auth(cfg)

	api := r.Group("/api")

	// Health check (no auth required)
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// ── Auth ─────────────────────────────────────────────────────────────────
	authGroup := api.Group("/auth")
	{
		// Stricter limit on login: 10 requests/min per IP (brute-force protection)
		authGroup.POST("/login", middleware.RateLimit(10, time.Minute), h.Login)
		authGroup.GET("/me", auth, h.Me)
		authGroup.POST("/change-password", auth, h.ChangePassword)
	}

	// ── Records (JWT required) ────────────────────────────────────────────────
	rec := api.Group("/records", auth)
	{
		rec.GET("", h.ListRecords)
		rec.GET("/summary/daily", h.DailySummary)
		rec.GET("/summary/monthly", h.MonthlySummary)
		rec.GET("/export", h.ExportRecordsExcel)
		rec.POST("", h.CreateRecord)
		rec.PUT("/:id", h.UpdateRecord)
		rec.DELETE("/:id", h.DeleteRecord)
	}

	// ── Admin (JWT + role=admin required) ────────────────────────────────────
	admin := api.Group("/admin", auth, middleware.AdminOnly())
	{
		admin.GET("/users", h.ListUsers)
		admin.POST("/users", h.CreateUser)
		admin.PUT("/users/:id", h.UpdateUser)
		admin.DELETE("/users/:id", h.DeleteUser)
		admin.POST("/users/:id/restore", h.RestoreUser)
		admin.GET("/users/deleted", h.ListDeletedUsers)
		admin.GET("/report", h.AdminReport)
		admin.GET("/report/export", h.ExportReportCSV)
	}

	return r
}
