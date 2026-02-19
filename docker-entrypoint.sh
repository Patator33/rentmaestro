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
    echo "⚠️ Migrations failed, attempting db push..."
    prisma db push --accept-data-loss --skip-generate
fi

# Seed
echo "🌱 Running seed script..."
node prisma/seed.js

# Start the application
exec node server.js
