package model

import (
	"time"

	"gorm.io/gorm"
)

// Record maps to the `records` table.
//
// The DB stores `date` as PostgreSQL DATE (scans into time.Time).
// We expose it as a YYYY-MM-DD string in JSON via the DateStr virtual field,
// which is populated automatically by the AfterFind GORM hook.
type Record struct {
	ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID       string    `gorm:"column:user_id;type:uuid;not null"              json:"user_id"`
	Date         time.Time `gorm:"column:date;type:date;not null"                 json:"-"`
	DateStr      string    `gorm:"-"                                              json:"date"` // set by AfterFind / handlers
	Seq          int       `gorm:"not null"                                       json:"seq"`
	RecordType   string    `gorm:"column:record_type;not null;default:string"     json:"record_type"`
	Racket       string    `gorm:"not null;size:200;default:''"                   json:"racket"`
	String1      string    `gorm:"column:string1;size:200;default:''"             json:"string1"`
	String2      string    `gorm:"column:string2;size:200;default:''"             json:"string2"`
	Price        int       `gorm:"not null"                                       json:"price"`
	IsNewRacket  bool      `gorm:"column:is_new_racket;not null;default:false"    json:"is_new_racket"`
	ActivityName string    `gorm:"column:activity_name;size:200;default:''"       json:"activity_name"`
	Note         string    `gorm:"default:''"                                     json:"note"`
	CreatedAt    time.Time `                                                       json:"created_at"`
	UpdatedAt    time.Time `                                                       json:"updated_at"`
}

// TableName tells GORM to use "records" explicitly.
func (Record) TableName() string { return "records" }

// AfterFind is a GORM hook that runs after every Find / First / Scan into Record.
// It converts the time.Time Date field into a YYYY-MM-DD string for JSON output.
func (r *Record) AfterFind(_ *gorm.DB) error {
	r.DateStr = r.Date.Format("2006-01-02")
	return nil
}

// ─── Input types ──────────────────────────────────────────────────────────────

// CreateRecordInput is the request body for POST /api/records.
type CreateRecordInput struct {
	Date         string `json:"date"          binding:"required"`
	RecordType   string `json:"record_type"`
	Racket       string `json:"racket"`
	String1      string `json:"string1"`
	String2      string `json:"string2"`
	Price        int    `json:"price"         binding:"required,min=1"`
	IsNewRacket  bool   `json:"is_new_racket"`
	ActivityName string `json:"activity_name"`
	Note         string `json:"note"`
}

// UpdateRecordInput is the request body for PUT /api/records/:id.
type UpdateRecordInput struct {
	RecordType   string `json:"record_type"`
	Racket       string `json:"racket"`
	String1      string `json:"string1"`
	String2      string `json:"string2"`
	Price        int    `json:"price"         binding:"required,min=1"`
	IsNewRacket  bool   `json:"is_new_racket"`
	ActivityName string `json:"activity_name"`
	Note         string `json:"note"`
}

// ─── Summary types ────────────────────────────────────────────────────────────

const NewRacketCommission = 200 // ค่าคอมขายไม้ใหม่ต่อรายการ

// DaySummary is returned by GET /api/records/summary/daily.
type DaySummary struct {
	Date       string `json:"date"`
	Count      int    `json:"count"`
	Total      int    `json:"total"`       // รายได้รวมทุกประเภท
	SaleCount  int    `json:"sale_count"`  // จำนวนที่มีไม้ใหม่
	SaleTotal  int    `json:"sale_total"`  // ค่าคอมขายไม้ (sale_count * 200)
	OtherCount int    `json:"other_count"` // จำนวน record type=other
	OtherTotal int    `json:"other_total"` // ยอดรายได้อื่นๆ
}

// MonthSummary is returned by GET /api/records/summary/monthly.
type MonthSummary struct {
	Month      string `json:"month"`
	Count      int    `json:"count"`
	Total      int    `json:"total"`
	SaleCount  int    `json:"sale_count"`
	SaleTotal  int    `json:"sale_total"`
	OtherCount int    `json:"other_count"`
	OtherTotal int    `json:"other_total"`
}
