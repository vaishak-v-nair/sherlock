package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sherlock/confidence-engine/redis"
	"sherlock/confidence-engine/state"
	"syscall"
)

func main() {
	log.Println("Starting Confidence Engine...")

	// Initialize the concurrency-safe state machine
	aggregator := state.NewAggregator()

	// Context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start the Redis subscriber in a goroutine
	go redis.StartSubscriber(ctx, aggregator)

	// Wait for termination signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	
	<-sigChan
	log.Println("Shutdown signal received. Exiting...")
	cancel()
}
