package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all origins for distributed access
}

var (
	rdb *redis.Client
	ctx = context.Background()
)

func main() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	rdb = redis.NewClient(&redis.Options{Addr: redisURL})

	http.HandleFunc("/ws", handleConnections)

	port := "8081"
	fmt.Printf("WebSocket Real-Time Service starting on port %s...\n", port)
	
	// Start listening to Redis Pub/Sub for global sync events
	go listenToRedisPubSub()

	log.Fatal(http.ListenAndServe(":"+port, nil))
}

var clients = make(map[*websocket.Conn]bool) // Connected clients

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer ws.Close()

	clients[ws] = true

	for {
		var msg map[string]interface{}
		err := ws.ReadJSON(&msg)
		if err != nil {
			delete(clients, ws)
			break
		}
		// If a client updates profile, publish to Redis so all instances get the event
		if msg["type"] == "PROFILE_UPDATE" {
			rdb.Publish(ctx, "global_updates", "profile_changed")
		}
	}
}

func listenToRedisPubSub() {
	pubsub := rdb.Subscribe(ctx, "global_updates")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for msg := range ch {
		// Broadcast to all connected WebSockets on this specific node
		for client := range clients {
			err := client.WriteJSON(map[string]string{
				"event":   "SYNC_REQUIRED",
				"payload": msg.Payload,
			})
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
	}
}
