-- AlterTable: Lease - add depositPaidAmount for partial deposit tracking
ALTER TABLE "Lease" ADD COLUMN "depositPaidAmount" REAL;
