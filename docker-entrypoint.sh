#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Run migration explicitly
echo "Running database migrations..."
prisma migrate deploy || echo "Migrate deploy failed, trying db push..." && prisma db push --accept-data-loss --skip-generate

# Seed if database is empty
./node_modules/.bin/ts-node --project prisma/tsconfig.seed.json prisma/seed.ts || true

# Start the application
exec node server.js
