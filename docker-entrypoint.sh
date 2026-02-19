#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Run migration explicitly
echo "Running database migrations..."
npx prisma migrate deploy || echo "Migrate deploy failed, trying db push..." && npx prisma db push --accept-data-loss

# Seed if database is empty
npx prisma db seed || true

# Start the application
exec node server.js
