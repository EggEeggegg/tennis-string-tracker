# ── Stage 1: Build ──────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install gcc for CGO (sqlite driver needs it)
RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

# ── Stage 2: Run ────────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
