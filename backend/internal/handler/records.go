package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"tennis-tracker/internal/model"
)

// GET /api/records?date=YYYY-MM-DD  OR  ?start=&end=
func (h *Handler) ListRecords(c *gin.Context) {
	userID := c.GetString("userID")
	date := c.Query("date")
	start := c.Query("start")
	end := c.Query("end")

	q := h.db.Where("user_id = ?", userID).Order("date DESC, seq ASC")

	switch {
	case date != "":
		q = q.Where("date = ?", date)
	case start != "" && end != "":
		q = q.Where("date BETWEEN ? AND ?", start, end)
	}

	var records []model.Record
	if err := q.Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query records"})
		return
	}

	c.JSON(http.StatusOK, records)
}

// POST /api/records
func (h *Handler) CreateRecord(c *gin.Context) {
	userID := c.GetString("userID")

	var input model.CreateRecordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, expected YYYY-MM-DD"})
		return
	}

	var maxSeq int
	h.db.Model(&model.Record{}).
		Where("user_id = ? AND date = ?", userID, input.Date).
		Select("COALESCE(MAX(seq), 0)").
		Scan(&maxSeq)

	record := model.Record{
		UserID:      userID,
		Date:        parsedDate,
		Seq:         maxSeq + 1,
		Racket:      input.Racket,
		String1:     input.String1,
		String2:     input.String2,
		Price:       input.Price,
		IsNewRacket: input.IsNewRacket,
		Note:        input.Note,
	}

	if err := h.db.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create record"})
		return
	}

	record.DateStr = record.Date.Format("2006-01-02")
	c.JSON(http.StatusCreated, record)
}

// PUT /api/records/:id
func (h *Handler) UpdateRecord(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	var input model.UpdateRecordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var record model.Record
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "record not found"})
		return
	}

	record.Racket = input.Racket
	record.String1 = input.String1
	record.String2 = input.String2
	record.Price = input.Price
	record.IsNewRacket = input.IsNewRacket
	record.Note = input.Note

	if err := h.db.Save(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update record"})
		return
	}

	record.DateStr = record.Date.Format("2006-01-02")
	c.JSON(http.StatusOK, record)
}

// DELETE /api/records/:id
func (h *Handler) DeleteRecord(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	var record model.Record
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "record not found"})
		return
	}

	date := record.Date

	if err := h.db.Delete(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete record"})
		return
	}

	h.db.Exec(`
		WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY seq) AS new_seq
			  FROM records WHERE user_id = ? AND date = ?
		)
		UPDATE records SET seq = ranked.new_seq
		  FROM ranked WHERE records.id = ranked.id
	`, userID, date)

	c.Status(http.StatusNoContent)
}

// GET /api/records/summary/daily?start=&end=
func (h *Handler) DailySummary(c *gin.Context) {
	userID := c.GetString("userID")
	start := c.Query("start")
	end := c.Query("end")

	if start == "" && end == "" {
		today := time.Now().UTC()
		start = today.AddDate(0, 0, -6).Format("2006-01-02")
		end = today.Format("2006-01-02")
	}

	sql := `SELECT date,
	               COUNT(*)::int                                        AS count,
	               SUM(price)::int                                      AS total,
	               COUNT(*) FILTER (WHERE is_new_racket)::int           AS sale_count,
	               (COUNT(*) FILTER (WHERE is_new_racket) * ?)::int     AS sale_total
	          FROM records WHERE user_id = ?`
	args := []any{model.NewRacketCommission, userID}

	if start != "" {
		sql += " AND date >= ?"
		args = append(args, start)
	}
	if end != "" {
		sql += " AND date <= ?"
		args = append(args, end)
	}
	sql += " GROUP BY date ORDER BY date DESC"

	var rows []struct {
		Date      time.Time
		Count     int
		Total     int
		SaleCount int
		SaleTotal int
	}
	if err := h.db.Raw(sql, args...).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query daily summary"})
		return
	}

	result := make([]model.DaySummary, len(rows))
	for i, r := range rows {
		result[i] = model.DaySummary{
			Date:      r.Date.Format("2006-01-02"),
			Count:     r.Count,
			Total:     r.Total,
			SaleCount: r.SaleCount,
			SaleTotal: r.SaleTotal,
		}
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/records/summary/monthly?year=2025
func (h *Handler) MonthlySummary(c *gin.Context) {
	userID := c.GetString("userID")
	year := c.Query("year")

	sql := `SELECT TO_CHAR(date, 'YYYY-MM')                            AS month,
	               COUNT(*)::int                                        AS count,
	               SUM(price)::int                                      AS total,
	               COUNT(*) FILTER (WHERE is_new_racket)::int           AS sale_count,
	               (COUNT(*) FILTER (WHERE is_new_racket) * ?)::int     AS sale_total
	          FROM records WHERE user_id = ?`
	args := []any{model.NewRacketCommission, userID}

	if year != "" {
		sql += " AND EXTRACT(YEAR FROM date) = ?"
		args = append(args, year)
	}
	sql += " GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month DESC"

	var result []model.MonthSummary
	if err := h.db.Raw(sql, args...).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query monthly summary"})
		return
	}

	c.JSON(http.StatusOK, result)
}
