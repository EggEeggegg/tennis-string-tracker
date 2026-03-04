package handler

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"tennis-tracker/internal/model"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var usernameRegex = regexp.MustCompile(`^[a-z0-9_-]+$`)

// GET /api/admin/users
func (h *Handler) ListUsers(c *gin.Context) {
	var users []model.User
	if err := h.db.Order("created_at ASC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// POST /api/admin/users
func (h *Handler) CreateUser(c *gin.Context) {
	var input model.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Normalize and validate username
	input.Username = strings.ToLower(strings.TrimSpace(input.Username))
	if !usernameRegex.MatchString(input.Username) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username ใช้ได้เฉพาะ a-z, 0-9, _ และ - เท่านั้น"})
		return
	}

	role := model.UserRoleUser
	if input.Role != "" {
		role = model.UserRole(input.Role)
		if !role.IsValid() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'user'"})
			return
		}
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := model.User{
		Username: input.Username,
		Password: string(hashed),
		Name:     input.Name,
		Role:     role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "username already exists"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// PUT /api/admin/users/:id
func (h *Handler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var input model.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Role != "" {
		role := model.UserRole(input.Role)
		if !role.IsValid() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'user'"})
			return
		}
	}

	var user model.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Use a map so GORM updates boolean false correctly (struct Updates skips zero values)
	updates := map[string]any{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if input.Role != "" {
		updates["role"] = model.UserRole(input.Role)
	}

	if len(updates) > 0 {
		if err := h.db.Model(&user).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}
	}

	c.JSON(http.StatusOK, user)
}

// DELETE /api/admin/users/:id
func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	if id == c.GetString("userID") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete your own account"})
		return
	}

	result := h.db.Delete(&model.User{}, "id = ?", id)
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GET /api/admin/report?start=&end=&user_id=
func (h *Handler) AdminReport(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	type UserReport struct {
		UserID   string `db:"id" json:"user_id"`
		Name     string `db:"name" json:"name"`
		Username string `db:"username" json:"username"`
		Count    int    `db:"count" json:"count"`
		Total    int    `db:"total" json:"total"`
		Count200 int    `db:"count_200" json:"count_200"`
		Count300 int    `db:"count_300" json:"count_300"`
	}

	// Build parameterized query
	query := `
		SELECT
			u.id,
			u.name,
			u.username,
			COUNT(r.id) AS count,
			COALESCE(SUM(r.price), 0) AS total,
			COUNT(CASE WHEN r.price = 200 THEN 1 END) AS count_200,
			COUNT(CASE WHEN r.price = 300 THEN 1 END) AS count_300
		FROM users u
		LEFT JOIN records r ON r.user_id = u.id`

	var args []interface{}
	argCount := 1

	if start != "" {
		query += fmt.Sprintf(" AND (r.id IS NULL OR r.date >= $%d)", argCount)
		args = append(args, start)
		argCount++
	}

	if end != "" {
		query += fmt.Sprintf(" AND (r.id IS NULL OR r.date <= $%d)", argCount)
		args = append(args, end)
		argCount++
	}

	query += " GROUP BY u.id, u.name, u.username ORDER BY total DESC, u.name"

	result := make([]UserReport, 0)

	// DEBUG: Log query and args
	fmt.Printf("DEBUG Query: %s\n", query)
	fmt.Printf("DEBUG Args: %v\n", args)

	if err := h.db.Raw(query, args...).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query report: %v", err)})
		return
	}

	// DEBUG: Log result
	fmt.Printf("DEBUG Result count: %d\n", len(result))

	var grandTotal, grandCount int
	for _, r := range result {
		grandTotal += r.Total
		grandCount += r.Count
	}

	c.JSON(http.StatusOK, gin.H{
		"users":       result,
		"grand_total": grandTotal,
		"grand_count": grandCount,
		"period": gin.H{
			"start": start,
			"end":   end,
			"as_of": time.Now().Format(time.RFC3339),
		},
	})
}
