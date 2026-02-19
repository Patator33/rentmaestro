#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Run migration explicitly
echo "Running database migrations..."
prisma migrate deploy || echo "Migrate deploy failed, trying db push..." && prisma db push --accept-data-loss --skip-generate

# Seed if database is empty
prisma db seed || true

# Start the application
exec node server.js
