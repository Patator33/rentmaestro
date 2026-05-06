#!/bin/sh
set -e

# Suppress Prisma update check
export PRISMA_HIDE_UPDATE_MESSAGE=true

# Ensure data directory exists
mkdir -p /app/data

echo "Starting deployment logic..."

# Run migrations
if prisma migrate deploy; then
    echo "✅ Migrations applied successfully."
else
    echo "❌ Migrations failed. Check logs."
    exit 1
fi


# Start the application
exec node server.js
