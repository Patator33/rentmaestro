-- AlterTable
ALTER TABLE "Lease" ADD COLUMN "depositAmount" REAL;
ALTER TABLE "Lease" ADD COLUMN "depositReturnedAt" DATETIME;
ALTER TABLE "Lease" ADD COLUMN "depositStatus" TEXT;
