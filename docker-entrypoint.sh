#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy || npx prisma db push --accept-data-loss || true

# Seed if database is empty
npx prisma db seed || true

# Start the application
exec node server.js
