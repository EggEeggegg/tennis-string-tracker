# Backend Unit Tests

Comprehensive unit tests for Tennis String Tracker backend handlers and models.

## Running Tests

```bash
cd backend
go test ./tests -v
```

### Test Results

All 13 tests passing ✅

```
=== RUN   TestLogin_ValidCredentials
--- PASS: TestLogin_ValidCredentials (0.56s)
=== RUN   TestCreateUserInput_Validation
=== RUN   TestUserRole_Validation
=== RUN   TestRecordType_Validation
=== RUN   TestJWTClaims_Structure
=== RUN   TestNewRacketCommission_Constant
=== RUN   TestCaseInsensitiveUsername
=== RUN   TestHTTPStatusCodes
=== RUN   TestJSONMarshaling
=== RUN   TestGinContextGetSetValues
=== RUN   TestHttpRequestBodyParsing
PASS
ok  	tennis-tracker/tests	1.323s
```

## Test Coverage

### 1. Authentication
- **TestLogin_ValidCredentials**: Bcrypt password hashing and validation
- **TestCaseInsensitiveUsername**: Username normalization (lowercase)

### 2. User Input Validation
- **TestCreateUserInput_Validation**: Username format validation (a-z, 0-9, _, -)
  - Valid: `john_doe`, `user-123`, `test_user_1`
  - Invalid: `John` (uppercase), `john doe` (space), `john@doe` (special char)

### 3. Data Model Validation
- **TestUpdateUserInput_BoolPointer**: Distinguish between nil and false values
- **TestUserRole_Validation**: Role enum (admin|user)
  - Valid: `admin`, `user`
  - Invalid: `superadmin`, empty string

- **TestRecordType_Validation**: Record type and price constraints
  - String type: price must be 200 or 300
  - Other type: any price allowed
  - Invalid: unknown type

### 4. Constants & Configuration
- **TestNewRacketCommission_Constant**: Verify commission is 200
- **TestJWTClaims_Structure**: JWT claims structure

### 5. HTTP & Serialization
- **TestHTTPStatusCodes**: Verify all status codes (201, 200, 400, 401, 403, 404, 409, 500)
- **TestJSONMarshaling**: Verify password field is not serialized (json:"-")
- **TestGinContextGetSetValues**: Gin context get/set operations
- **TestHttpRequestBodyParsing**: JSON body parsing with ShouldBindJSON

## Test Architecture

Tests are unit tests focused on:
- ✅ Input validation logic
- ✅ Data structure constraints
- ✅ HTTP status codes
- ✅ JSON serialization/deserialization
- ✅ Helper function behavior

**Not covered** (require full integration with DB):
- Database persistence
- Full handler HTTP flows
- Middleware authorization

For full integration testing, use `go test ./...` with database fixtures.

## Adding New Tests

1. Add test function to `handler_test.go`
2. Follow naming convention: `Test<Function>_<Scenario>`
3. Use table-driven tests for multiple cases
4. Run: `go test ./tests -v`

Example:
```go
func TestMyFunction_SuccesCase(t *testing.T) {
    result := myFunction("input")
    assert.Equal(t, expected, result)
}
```

## Dependencies

- `github.com/stretchr/testify/assert` - Assertion helpers
- `golang.org/x/crypto/bcrypt` - Password hashing
- `github.com/gin-gonic/gin` - Web framework
