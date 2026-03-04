package model

import "time"

// UserRole enum type for database ENUM
type UserRole string

const (
	UserRoleAdmin UserRole = "admin"
	UserRoleUser  UserRole = "user"
)

// IsValid checks if the role is valid
func (ur UserRole) IsValid() bool {
	return ur == UserRoleAdmin || ur == UserRoleUser
}

// User maps to the `users` table.
type User struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null;size:50"                   json:"username"`
	Password  string    `gorm:"not null;size:255"                              json:"-"` // never serialised
	Name      string    `gorm:"not null;size:100"                              json:"name"`
	Role      UserRole  `gorm:"not null;type:user_role_enum;default:'user'"    json:"role"`
	IsActive  bool      `gorm:"default:true"                                   json:"is_active"`
	CreatedAt time.Time `                                                       json:"created_at"`
	UpdatedAt time.Time `                                                       json:"updated_at"`
}

// TableName tells GORM to use "users" explicitly.
func (User) TableName() string { return "users" }

// CreateUserInput is the request body for POST /api/admin/users.
type CreateUserInput struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"     binding:"required"`
	Role     string `json:"role"`
}

// UpdateUserInput is the request body for PUT /api/admin/users/:id.
type UpdateUserInput struct {
	Name     string `json:"name"`
	IsActive *bool  `json:"is_active"` // pointer so we can distinguish false vs omitted
	Role     string `json:"role"`
}
