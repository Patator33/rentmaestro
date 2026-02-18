#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true

# Seed if database is empty
npx prisma db seed 2>/dev/null || true

# Start the application
exec node server.js
