package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/jackc/pgx/v4/pgxpool"
)

var (
	rdb *redis.Client
	db  *pgxpool.Pool
	ctx = context.Background()
)

type Product struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

func main() {
	// Initialize Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Initialize Postgres (Mock setup for blueprint)
	dbURL := os.Getenv("DB_URL")
	if dbURL != "" {
		var err error
		db, err = pgxpool.Connect(ctx, dbURL)
		if err != nil {
			log.Fatalf("Unable to connect to database: %v\n", err)
		}
		defer db.Close()
	}

	http.HandleFunc("/api/inventory", handleInventory)
	
	port := "8080"
	fmt.Printf("Inventory Service starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleInventory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Fast Path: Try Redis Cache First
	cacheKey := "inventory_all"
	val, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(val))
		return
	}

	w.Header().Set("X-Cache", "MISS")

	// Fallback to Database (Simulated)
	products := []Product{
		{ID: "1", Name: "High-Performance DB Shard", Price: 5000.0, Stock: 100},
		{ID: "2", Name: "Edge Compute Node", Price: 250.0, Stock: 500},
	}

	data, _ := json.Marshal(products)
	
	// Asynchronously update cache
	go func() {
		rdb.Set(ctx, cacheKey, data, 5*time.Minute)
	}()

	w.Write(data)
}
