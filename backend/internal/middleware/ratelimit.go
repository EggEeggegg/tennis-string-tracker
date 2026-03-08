package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type window struct {
	mu    sync.Mutex
	count int
	start time.Time
}

type rateLimiter struct {
	visitors sync.Map
	limit    int
	duration time.Duration
}

func newRateLimiter(limit int, d time.Duration) *rateLimiter {
	rl := &rateLimiter{limit: limit, duration: d}
	go rl.cleanup()
	return rl
}

// cleanup removes stale entries every 2× window to avoid unbounded memory growth.
func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(rl.duration * 2)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-rl.duration * 2)
		rl.visitors.Range(func(k, v any) bool {
			w := v.(*window)
			w.mu.Lock()
			stale := w.start.Before(cutoff)
			w.mu.Unlock()
			if stale {
				rl.visitors.Delete(k)
			}
			return true
		})
	}
}

func (rl *rateLimiter) allow(ip string) bool {
	now := time.Now()
	val, _ := rl.visitors.LoadOrStore(ip, &window{start: now})
	w := val.(*window)

	w.mu.Lock()
	defer w.mu.Unlock()

	// Reset counter when window has elapsed
	if now.Sub(w.start) >= rl.duration {
		w.count = 0
		w.start = now
	}

	w.count++
	return w.count <= rl.limit
}

// RateLimit returns a Gin middleware that limits requests per client IP.
// limit = max requests, d = sliding window duration.
func RateLimit(limit int, d time.Duration) gin.HandlerFunc {
	rl := newRateLimiter(limit, d)
	return func(c *gin.Context) {
		if !rl.allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please slow down",
			})
			return
		}
		c.Next()
	}
}
