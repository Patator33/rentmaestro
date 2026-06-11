-- AlterTable: add IRL revision baseline fields to Lease
ALTER TABLE "Lease" ADD COLUMN "irlBaseIndex" REAL;
ALTER TABLE "Lease" ADD COLUMN "irlBaseQuarter" TEXT;
