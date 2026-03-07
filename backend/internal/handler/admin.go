package handler

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"tennis-tracker/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

var usernameRegex = regexp.MustCompile(`^[a-z0-9_-]+$`)

type UserReport struct {
	UserID     string `gorm:"column:user_id"     json:"user_id"`
	Name       string `gorm:"column:name"        json:"name"`
	Username   string `gorm:"column:username"    json:"username"`
	Count      int    `gorm:"column:count"       json:"count"`
	Total      int    `gorm:"column:total"       json:"total"`
	Count200   int    `gorm:"column:count_200"   json:"count_200"`
	Count300   int    `gorm:"column:count_300"   json:"count_300"`
	SaleCount  int    `gorm:"column:sale_count"  json:"sale_count"`
	SaleTotal  int    `gorm:"column:sale_total"  json:"sale_total"`
	OtherCount int    `gorm:"column:other_count" json:"other_count"`
	OtherTotal int    `gorm:"column:other_total" json:"other_total"`
}

// GET /api/admin/users
func (h *Handler) ListUsers(c *gin.Context) {
	var users []model.User
	// เฉพาะ active users (is_deleted = false)
	if err := h.db.Where("is_deleted = ?", false).Order("created_at ASC").Find(&users).Error; err != nil {
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

	// Prevent admin from banning themselves
	if input.IsActive != nil && !*input.IsActive && id == c.GetString("userID") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot ban your own account"})
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

	// Soft delete: set is_deleted = true instead of actually deleting
	result := h.db.Model(&model.User{}).Where("id = ?", id).Update("is_deleted", true)
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GET /api/admin/users/deleted
func (h *Handler) ListDeletedUsers(c *gin.Context) {
	var users []model.User
	// เฉพาะ deleted users (is_deleted = true)
	if err := h.db.Where("is_deleted = ?", true).Order("updated_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query deleted users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// POST /api/admin/users/:id/restore
func (h *Handler) RestoreUser(c *gin.Context) {
	id := c.Param("id")

	// Restore: set is_deleted = false
	result := h.db.Model(&model.User{}).Where("id = ?", id).Update("is_deleted", false)
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var user model.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve restored user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// GET /api/admin/report?start=&end=&user_id=
func (h *Handler) AdminReport(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	type UserReport struct {
		UserID     string `gorm:"column:user_id"     json:"user_id"`
		Name       string `gorm:"column:name"        json:"name"`
		Username   string `gorm:"column:username"    json:"username"`
		Count      int    `gorm:"column:count"       json:"count"`
		Total      int    `gorm:"column:total"       json:"total"`
		Count200   int    `gorm:"column:count_200"   json:"count_200"`
		Count300   int    `gorm:"column:count_300"   json:"count_300"`
		SaleCount  int    `gorm:"column:sale_count"  json:"sale_count"`
		SaleTotal  int    `gorm:"column:sale_total"  json:"sale_total"`
		OtherCount int    `gorm:"column:other_count" json:"other_count"`
		OtherTotal int    `gorm:"column:other_total" json:"other_total"`
	}

	// Build parameterized query — date filters go in JOIN to keep all users visible
	joinCond := "r.user_id = u.id"
	var args []interface{}
	argCount := 1

	if start != "" {
		joinCond += fmt.Sprintf(" AND r.date >= $%d", argCount)
		args = append(args, start)
		argCount++
	}
	if end != "" {
		joinCond += fmt.Sprintf(" AND r.date <= $%d", argCount)
		args = append(args, end)
		argCount++
	}

	query := fmt.Sprintf(`
		SELECT
			u.id                                                                 AS user_id,
			u.name,
			u.username,
			COUNT(r.id) FILTER (WHERE r.record_type = 'string' OR r.record_type IS NULL) AS count,
			COALESCE(SUM(r.price) FILTER (WHERE r.record_type = 'string' OR r.record_type IS NULL), 0) AS total,
			COUNT(r.id) FILTER (WHERE r.price = 200 AND (r.record_type = 'string' OR r.record_type IS NULL)) AS count_200,
			COUNT(r.id) FILTER (WHERE r.price = 300 AND (r.record_type = 'string' OR r.record_type IS NULL)) AS count_300,
			COUNT(r.id) FILTER (WHERE r.is_new_racket)                           AS sale_count,
			COALESCE(SUM(CASE WHEN r.is_new_racket THEN 200 END), 0)             AS sale_total,
			COUNT(r.id) FILTER (WHERE r.record_type = 'other')                   AS other_count,
			COALESCE(SUM(r.price) FILTER (WHERE r.record_type = 'other'), 0)     AS other_total
		FROM users u
		LEFT JOIN records r ON %s
		WHERE u.is_deleted = false
		GROUP BY u.id, u.name, u.username
		ORDER BY (COALESCE(SUM(r.price), 0)) DESC, u.name`, joinCond)

	result := make([]UserReport, 0)

	if err := h.db.Raw(query, args...).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query report: %v", err)})
		return
	}

	var grandTotal, grandCount, grandOtherTotal, grandOtherCount int
	for _, r := range result {
		grandTotal += r.Total
		grandCount += r.Count
		grandOtherTotal += r.OtherTotal
		grandOtherCount += r.OtherCount
	}

	c.JSON(http.StatusOK, gin.H{
		"users":             result,
		"grand_total":       grandTotal,
		"grand_count":       grandCount,
		"grand_other_total": grandOtherTotal,
		"grand_other_count": grandOtherCount,
		"period": gin.H{
			"start": start,
			"end":   end,
			"as_of": time.Now().Format(time.RFC3339),
		},
	})
}

// GET /api/admin/report/export?start=&end=
func (h *Handler) ExportReportCSV(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")

	// Build parameterized query
	joinCond := "r.user_id = u.id"
	var args []interface{}
	argCount := 1

	if start != "" {
		joinCond += fmt.Sprintf(" AND r.date >= $%d", argCount)
		args = append(args, start)
		argCount++
	}
	if end != "" {
		joinCond += fmt.Sprintf(" AND r.date <= $%d", argCount)
		args = append(args, end)
		argCount++
	}

	query := fmt.Sprintf(`
		SELECT
			u.id                                                                 AS user_id,
			u.name,
			u.username,
			COUNT(r.id) FILTER (WHERE r.record_type = 'string' OR r.record_type IS NULL) AS count,
			COALESCE(SUM(r.price) FILTER (WHERE r.record_type = 'string' OR r.record_type IS NULL), 0) AS total,
			COUNT(r.id) FILTER (WHERE r.price = 200 AND (r.record_type = 'string' OR r.record_type IS NULL)) AS count_200,
			COUNT(r.id) FILTER (WHERE r.price = 300 AND (r.record_type = 'string' OR r.record_type IS NULL)) AS count_300,
			COUNT(r.id) FILTER (WHERE r.is_new_racket)                           AS sale_count,
			COALESCE(SUM(CASE WHEN r.is_new_racket THEN 200 END), 0)             AS sale_total,
			COUNT(r.id) FILTER (WHERE r.record_type = 'other')                   AS other_count,
			COALESCE(SUM(r.price) FILTER (WHERE r.record_type = 'other'), 0)     AS other_total
		FROM users u
		LEFT JOIN records r ON %s
		GROUP BY u.id, u.name, u.username
		ORDER BY (COALESCE(SUM(r.price), 0)) DESC, u.name`, joinCond)

	result := make([]UserReport, 0)

	if err := h.db.Raw(query, args...).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query report: %v", err)})
		return
	}

	var grandTotal, grandCount, grandSaleTotal, grandSaleCount, grandOtherTotal, grandOtherCount int
	for _, r := range result {
		grandTotal += r.Total
		grandCount += r.Count
		grandSaleTotal += r.SaleTotal
		grandSaleCount += r.SaleCount
		grandOtherTotal += r.OtherTotal
		grandOtherCount += r.OtherCount
	}

	// Query all records for the second sheet
	var records []model.Record
	recordQuery := h.db.Where("1=1")
	if start != "" {
		recordQuery = recordQuery.Where("date >= ?", start)
	}
	if end != "" {
		recordQuery = recordQuery.Where("date <= ?", end)
	}
	if err := recordQuery.Order("date DESC, user_id, seq").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query records"})
		return
	}

	// Build user map from result (no extra query needed)
	userMap := make(map[string]string)
	for _, u := range result {
		userMap[u.UserID] = u.Name
	}

	// Create Excel file
	f := excelize.NewFile()

	// ═══════════════════════════════════════════════════════════════════════════
	// Sheet 1: Summary
	// ═══════════════════════════════════════════════════════════════════════════
	summarySheet := "Summary"
	f.SetSheetName("Sheet1", summarySheet)

	// Header info
	f.SetCellValue(summarySheet, "A1", "รายงาน String Tracker")
	if start != "" && end != "" {
		f.SetCellValue(summarySheet, "A2", fmt.Sprintf("ช่วงเวลา: %s ถึง %s", start, end))
		f.SetCellValue(summarySheet, "A3", fmt.Sprintf("สร้างเมื่อ: %s", time.Now().Format("2006-01-02 15:04:05")))
	} else {
		f.SetCellValue(summarySheet, "A2", fmt.Sprintf("สร้างเมื่อ: %s", time.Now().Format("2006-01-02 15:04:05")))
	}

	row := 5

	// Grand summary header
	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "=== ภาพรวมทั้งหมด ===")
	row++

	// Grand summary table
	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "รวมไม้")
	f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), "รายรับเอ็น")
	f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), "ขายไม้")
	f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), "ค่าคอม")
	f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), "รายได้อื่นๆ")
	f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), "รายรับรวม")
	row++

	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "ไม้")
	f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), "บาท")
	f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), "ไม้")
	f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), "บาท")
	f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), "บาท")
	f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), "บาท")
	row++

	totalRevenue := grandTotal + grandSaleTotal + grandOtherTotal
	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), grandCount)
	f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), grandTotal)
	f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), grandSaleCount)
	f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), grandSaleTotal)
	f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), grandOtherTotal)
	f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), totalRevenue)
	row += 2

	// Per-user summary
	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "=== รายละเอียดแต่ละคน ===")
	row++

	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "ชื่อ")
	f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), "Username")
	f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), "เอ็น (ไม้)")
	f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), "เอ็น (บาท)")
	f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), "฿200")
	f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), "฿300")
	f.SetCellValue(summarySheet, fmt.Sprintf("G%d", row), "ขายไม้ (ไม้)")
	f.SetCellValue(summarySheet, fmt.Sprintf("H%d", row), "ค่าคอม (บาท)")
	f.SetCellValue(summarySheet, fmt.Sprintf("I%d", row), "รายได้อื่นๆ (รายการ)")
	f.SetCellValue(summarySheet, fmt.Sprintf("J%d", row), "รายได้อื่นๆ (บาท)")
	f.SetCellValue(summarySheet, fmt.Sprintf("K%d", row), "รวมทั้งหมด (บาท)")
	row++

	for _, u := range result {
		userTotal := u.Total + u.SaleTotal + u.OtherTotal
		f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), u.Name)
		f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), "@"+u.Username)
		f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), u.Count)
		f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), u.Total)
		f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), u.Count200)
		f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), u.Count300)
		f.SetCellValue(summarySheet, fmt.Sprintf("G%d", row), u.SaleCount)
		f.SetCellValue(summarySheet, fmt.Sprintf("H%d", row), u.SaleTotal)
		f.SetCellValue(summarySheet, fmt.Sprintf("I%d", row), u.OtherCount)
		f.SetCellValue(summarySheet, fmt.Sprintf("J%d", row), u.OtherTotal)
		f.SetCellValue(summarySheet, fmt.Sprintf("K%d", row), userTotal)
		row++
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// Sheet 2: All Records
	// ═══════════════════════════════════════════════════════════════════════════
	recordsSheet := "Records"
	f.NewSheet(recordsSheet)

	// Header
	row = 1
	f.SetCellValue(recordsSheet, fmt.Sprintf("A%d", row), "วันที่")
	f.SetCellValue(recordsSheet, fmt.Sprintf("B%d", row), "ชื่อ")
	f.SetCellValue(recordsSheet, fmt.Sprintf("C%d", row), "ประเภท")
	f.SetCellValue(recordsSheet, fmt.Sprintf("D%d", row), "ไม้")
	f.SetCellValue(recordsSheet, fmt.Sprintf("E%d", row), "String 1")
	f.SetCellValue(recordsSheet, fmt.Sprintf("F%d", row), "String 2")
	f.SetCellValue(recordsSheet, fmt.Sprintf("G%d", row), "ราคา (บาท)")
	f.SetCellValue(recordsSheet, fmt.Sprintf("H%d", row), "ไม้ใหม่")
	f.SetCellValue(recordsSheet, fmt.Sprintf("I%d", row), "Activity/รายการ")
	f.SetCellValue(recordsSheet, fmt.Sprintf("J%d", row), "หมายเหตุ")
	row++

	// Data
	for _, rec := range records {
		userName, ok := userMap[rec.UserID]
		if !ok {
			userName = "[" + rec.UserID + "]" // แสดง user_id ถ้าไม่เจอชื่อ เพื่อ debug
		}

		recordType := rec.RecordType
		if recordType == "" {
			recordType = "string"
		}

		isNewRacketStr := ""
		if rec.IsNewRacket {
			isNewRacketStr = "ใช่"
		}

		f.SetCellValue(recordsSheet, fmt.Sprintf("A%d", row), rec.DateStr)
		f.SetCellValue(recordsSheet, fmt.Sprintf("B%d", row), userName)
		f.SetCellValue(recordsSheet, fmt.Sprintf("C%d", row), recordType)
		f.SetCellValue(recordsSheet, fmt.Sprintf("D%d", row), rec.Racket)
		f.SetCellValue(recordsSheet, fmt.Sprintf("E%d", row), rec.String1)
		f.SetCellValue(recordsSheet, fmt.Sprintf("F%d", row), rec.String2)
		f.SetCellValue(recordsSheet, fmt.Sprintf("G%d", row), rec.Price)
		f.SetCellValue(recordsSheet, fmt.Sprintf("H%d", row), isNewRacketStr)
		f.SetCellValue(recordsSheet, fmt.Sprintf("I%d", row), rec.ActivityName)
		f.SetCellValue(recordsSheet, fmt.Sprintf("J%d", row), rec.Note)
		row++
	}

	// Generate file bytes
	buf, err := f.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate Excel"})
		return
	}

	// Send Excel file
	filename := fmt.Sprintf("report_%s_%s.xlsx", start, end)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}
