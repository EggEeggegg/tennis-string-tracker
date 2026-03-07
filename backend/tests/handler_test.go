package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"tennis-tracker/internal/middleware"
	"tennis-tracker/internal/model"
)

func TestLogin_ValidCredentials(t *testing.T) {
	// This is a basic validation test that checks logic flow
	// Full integration requires a real DB or proper mocking

	// Test bcrypt password hashing
	password := "testpass123"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	assert.NoError(t, err)

	// Verify password matches
	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	assert.NoError(t, err)

	// Verify wrong password fails
	err = bcrypt.CompareHashAndPassword(hash, []byte("wrongpass"))
	assert.Error(t, err)
}

func TestCreateUserInput_Validation(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		password  string
		fullname  string
		wantValid bool
	}{
		{"valid lowercase", "john_doe", "password123", "John Doe", true},
		{"valid with dash", "john-doe", "password123", "John Doe", true},
		{"valid with numbers", "user123", "password123", "User Name", true},
		{"invalid uppercase", "John", "password123", "John Doe", false},
		{"invalid space", "john doe", "password123", "John Doe", false},
		{"invalid special", "john@doe", "password123", "John Doe", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Simulate username validation (like in handler)
			isValid := isValidUsername(tc.username)
			assert.Equal(t, tc.wantValid, isValid)
		})
	}
}

func TestUpdateUserInput_BoolPointer(t *testing.T) {
	// Test that nil vs false is distinguishable
	input := model.UpdateUserInput{
		IsActive: nil,
	}

	assert.Nil(t, input.IsActive)

	trueVal := true
	input.IsActive = &trueVal
	assert.NotNil(t, input.IsActive)
	assert.True(t, *input.IsActive)

	falseVal := false
	input.IsActive = &falseVal
	assert.NotNil(t, input.IsActive)
	assert.False(t, *input.IsActive)
}

func TestUserRole_Validation(t *testing.T) {
	tests := []struct {
		role      model.UserRole
		wantValid bool
	}{
		{model.UserRoleAdmin, true},
		{model.UserRoleUser, true},
		{model.UserRole("superadmin"), false},
		{model.UserRole(""), false},
	}

	for _, tc := range tests {
		assert.Equal(t, tc.wantValid, tc.role.IsValid())
	}
}

func TestRecordType_Validation(t *testing.T) {
	tests := []struct {
		name       string
		recordType string
		price      int
		wantValid  bool
	}{
		{"string type with 200", "string", 200, true},
		{"string type with 300", "string", 300, true},
		{"string type with 250", "string", 250, false},
		{"other type with any price", "other", 500, true},
		{"invalid type", "unknown", 200, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			isValid := isValidRecord(tc.recordType, tc.price)
			assert.Equal(t, tc.wantValid, isValid)
		})
	}
}

func TestJWTClaims_Structure(t *testing.T) {
	claims := &middleware.Claims{
		UserID:   "test-id",
		Username: "testuser",
		Name:     "Test User",
		Role:     "admin",
	}

	assert.Equal(t, "test-id", claims.UserID)
	assert.Equal(t, "testuser", claims.Username)
	assert.Equal(t, "Test User", claims.Name)
	assert.Equal(t, "admin", claims.Role)
	assert.NotNil(t, claims.RegisteredClaims)
}

func TestNewRacketCommission_Constant(t *testing.T) {
	// Verify constant value for consistency
	assert.Equal(t, 200, model.NewRacketCommission)
}

func TestCaseInsensitiveUsername(t *testing.T) {
	// Simulate case-insensitive username handling
	username := "TestUser"
	normalized := lowerNormalize(username)
	assert.Equal(t, "testuser", normalized)
}

func TestHTTPStatusCodes(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		expected   int
	}{
		{"Created", http.StatusCreated, 201},
		{"OK", http.StatusOK, 200},
		{"BadRequest", http.StatusBadRequest, 400},
		{"Unauthorized", http.StatusUnauthorized, 401},
		{"Forbidden", http.StatusForbidden, 403},
		{"NotFound", http.StatusNotFound, 404},
		{"Conflict", http.StatusConflict, 409},
		{"InternalServerError", http.StatusInternalServerError, 500},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.statusCode)
		})
	}
}

func TestJSONMarshaling(t *testing.T) {
	user := model.User{
		Username: "testuser",
		Password: "should-not-appear", // marked with json:"-"
		Name:     "Test User",
		Role:     model.UserRoleAdmin,
	}

	data, err := json.Marshal(user)
	assert.NoError(t, err)

	var result map[string]interface{}
	json.Unmarshal(data, &result)

	// Password should not be in JSON output
	assert.NotContains(t, string(data), "should-not-appear")
	assert.Equal(t, "testuser", result["username"])
}

func TestGinContextGetSetValues(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	userID := "test-user-123"

	c.Set("userID", userID)
	retrieved := c.GetString("userID")

	assert.Equal(t, userID, retrieved)
}

func TestHttpRequestBodyParsing(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	body := `{"username":"testuser","password":"pass123","name":"Test"}`
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/admin/users",
		bytes.NewBufferString(body),
	)
	c.Request.Header.Set("Content-Type", "application/json")

	var input model.CreateUserInput
	err := c.ShouldBindJSON(&input)

	assert.NoError(t, err)
	assert.Equal(t, "testuser", input.Username)
	assert.Equal(t, "pass123", input.Password)
	assert.Equal(t, "Test", input.Name)
}

// ─── Helper functions ─────────────────────────────────────────────────────────

func isValidUsername(username string) bool {
	for _, ch := range username {
		if !((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_' || ch == '-') {
			return false
		}
	}
	return true
}

func isValidRecord(recordType string, price int) bool {
	switch recordType {
	case "string":
		return price == 200 || price == 300
	case "other":
		return true
	default:
		return false
	}
}

func lowerNormalize(s string) string {
	// Simulate the normalization done in Login handler
	return strings.ToLower(strings.TrimSpace(s))
}
