package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
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

	if input.RecordType == "" {
		input.RecordType = "string"
	}

	switch input.RecordType {
	case "string":
		if input.Racket == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "racket is required for string type"})
			return
		}
		if input.Price != 200 && input.Price != 300 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "price must be 200 or 300 for string type"})
			return
		}
	case "other":
		if input.ActivityName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "activity_name is required for other type"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "record_type must be 'string' or 'other'"})
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
		UserID:       userID,
		Date:         parsedDate,
		Seq:          maxSeq + 1,
		RecordType:   input.RecordType,
		Racket:       input.Racket,
		String1:      input.String1,
		String2:      input.String2,
		Price:        input.Price,
		IsNewRacket:  input.IsNewRacket,
		ActivityName: input.ActivityName,
		Note:         input.Note,
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

	// Use existing record_type if not provided
	if input.RecordType == "" {
		input.RecordType = record.RecordType
	}

	switch input.RecordType {
	case "string":
		if input.Racket == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "racket is required for string type"})
			return
		}
		if input.Price != 200 && input.Price != 300 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "price must be 200 or 300 for string type"})
			return
		}
	case "other":
		if input.ActivityName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "activity_name is required for other type"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "record_type must be 'string' or 'other'"})
		return
	}

	record.RecordType = input.RecordType
	record.Racket = input.Racket
	record.String1 = input.String1
	record.String2 = input.String2
	record.Price = input.Price
	record.IsNewRacket = input.IsNewRacket
	record.ActivityName = input.ActivityName
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
	               COUNT(*)::int                                             AS count,
	               SUM(price)::int                                           AS total,
	               COUNT(*) FILTER (WHERE is_new_racket)::int                AS sale_count,
	               (COUNT(*) FILTER (WHERE is_new_racket) * ?)::int          AS sale_total,
	               COUNT(*) FILTER (WHERE record_type = 'other')::int        AS other_count,
	               COALESCE(SUM(price) FILTER (WHERE record_type = 'other'), 0)::int AS other_total
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
		Date       time.Time
		Count      int
		Total      int
		SaleCount  int
		SaleTotal  int
		OtherCount int
		OtherTotal int
	}
	if err := h.db.Raw(sql, args...).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query daily summary"})
		return
	}

	result := make([]model.DaySummary, len(rows))
	for i, r := range rows {
		result[i] = model.DaySummary{
			Date:       r.Date.Format("2006-01-02"),
			Count:      r.Count,
			Total:      r.Total,
			SaleCount:  r.SaleCount,
			SaleTotal:  r.SaleTotal,
			OtherCount: r.OtherCount,
			OtherTotal: r.OtherTotal,
		}
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/records/summary/monthly?year=2025
func (h *Handler) MonthlySummary(c *gin.Context) {
	userID := c.GetString("userID")
	year := c.Query("year")

	sql := `SELECT TO_CHAR(date, 'YYYY-MM')                                        AS month,
	               COUNT(*)::int                                                    AS count,
	               SUM(price)::int                                                  AS total,
	               COUNT(*) FILTER (WHERE is_new_racket)::int                       AS sale_count,
	               (COUNT(*) FILTER (WHERE is_new_racket) * ?)::int                 AS sale_total,
	               COUNT(*) FILTER (WHERE record_type = 'other')::int               AS other_count,
	               COALESCE(SUM(price) FILTER (WHERE record_type = 'other'), 0)::int AS other_total
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

// GET /api/records/export?start=&end=
func (h *Handler) ExportRecordsExcel(c *gin.Context) {
	userID := c.GetString("userID")
	start := c.Query("start")
	end := c.Query("end")

	if start == "" || end == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start and end date are required"})
		return
	}

	q := h.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, start, end).
		Order("date DESC, seq ASC")

	var records []model.Record
	if err := q.Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query records"})
		return
	}

	// Create Excel file
	f := excelize.NewFile()

	// ═══════════════════════════════════════════════════════════════════════════
	// Sheet 1: Summary
	// ═══════════════════════════════════════════════════════════════════════════
	summarySheet := "Summary"
	f.SetSheetName("Sheet1", summarySheet)

	// Header info
	f.SetCellValue(summarySheet, "A1", "บันทึกการขึ้นเอ็น")
	f.SetCellValue(summarySheet, "A2", fmt.Sprintf("ช่วงเวลา: %s ถึง %s", start, end))
	f.SetCellValue(summarySheet, "A3", fmt.Sprintf("สร้างเมื่อ: %s", time.Now().Format("2006-01-02 15:04:05")))

	row := 5

	// Summary stats
	var stringCount int
	var stringTotal int
	var saleCount int
	var otherCount int
	var otherTotal int

	for _, rec := range records {
		if rec.RecordType == "string" || rec.RecordType == "" {
			stringCount++
			stringTotal += rec.Price
			if rec.IsNewRacket {
				saleCount++
			}
		} else if rec.RecordType == "other" {
			otherCount++
			otherTotal += rec.Price
		}
	}

	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), "=== สรุป ===")
	row++

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

	totalRevenue := stringTotal + (saleCount * model.NewRacketCommission) + otherTotal
	f.SetCellValue(summarySheet, fmt.Sprintf("A%d", row), stringCount)
	f.SetCellValue(summarySheet, fmt.Sprintf("B%d", row), stringTotal)
	f.SetCellValue(summarySheet, fmt.Sprintf("C%d", row), saleCount)
	f.SetCellValue(summarySheet, fmt.Sprintf("D%d", row), saleCount*model.NewRacketCommission)
	f.SetCellValue(summarySheet, fmt.Sprintf("E%d", row), otherTotal)
	f.SetCellValue(summarySheet, fmt.Sprintf("F%d", row), totalRevenue)

	// ═══════════════════════════════════════════════════════════════════════════
	// Sheet 2: Records
	// ═══════════════════════════════════════════════════════════════════════════
	recordsSheet := "Records"
	f.NewSheet(recordsSheet)

	// Header
	row = 1
	f.SetCellValue(recordsSheet, fmt.Sprintf("A%d", row), "วันที่")
	f.SetCellValue(recordsSheet, fmt.Sprintf("B%d", row), "ประเภท")
	f.SetCellValue(recordsSheet, fmt.Sprintf("C%d", row), "ไม้/กิจกรรม")
	f.SetCellValue(recordsSheet, fmt.Sprintf("D%d", row), "String 1")
	f.SetCellValue(recordsSheet, fmt.Sprintf("E%d", row), "String 2")
	f.SetCellValue(recordsSheet, fmt.Sprintf("F%d", row), "ราคา (บาท)")
	f.SetCellValue(recordsSheet, fmt.Sprintf("G%d", row), "ไม้ใหม่")
	f.SetCellValue(recordsSheet, fmt.Sprintf("H%d", row), "หมายเหตุ")
	row++

	// Data
	for _, rec := range records {
		// วันที่
		f.SetCellValue(recordsSheet, fmt.Sprintf("A%d", row), rec.DateStr)

		// ประเภท
		recordType := rec.RecordType
		if recordType == "" {
			recordType = "string"
		}
		displayType := "ขึ้นเอ็น"
		if recordType == "other" {
			displayType = "อื่นๆ"
		}
		f.SetCellValue(recordsSheet, fmt.Sprintf("B%d", row), displayType)

		// ไม้/กิจกรรม
		name := rec.Racket
		if recordType == "other" {
			name = rec.ActivityName
		}
		f.SetCellValue(recordsSheet, fmt.Sprintf("C%d", row), name)

		// String 1
		f.SetCellValue(recordsSheet, fmt.Sprintf("D%d", row), rec.String1)

		// String 2
		f.SetCellValue(recordsSheet, fmt.Sprintf("E%d", row), rec.String2)

		// ราคา
		f.SetCellValue(recordsSheet, fmt.Sprintf("F%d", row), rec.Price)

		// ไม้ใหม่
		isNewRacketStr := ""
		if rec.IsNewRacket {
			isNewRacketStr = "ใช่"
		}
		f.SetCellValue(recordsSheet, fmt.Sprintf("G%d", row), isNewRacketStr)

		// หมายเหตุ
		f.SetCellValue(recordsSheet, fmt.Sprintf("H%d", row), rec.Note)

		row++
	}

	// Generate file bytes
	buf, err := f.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate Excel"})
		return
	}

	// Send Excel file
	filename := fmt.Sprintf("tennis-records-%s-%s.xlsx", start, end)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}
