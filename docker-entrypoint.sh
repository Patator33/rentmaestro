#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Run migration explicitly
echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy || echo "Migrate deploy failed, trying db push..." && ./node_modules/.bin/prisma db push --accept-data-loss

# Seed if database is empty
./node_modules/.bin/prisma db seed || true

# Start the application
exec node server.js
