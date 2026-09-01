-- AlterTable: Lease - detailed deposit restitution (amount returned, note, email guard)
ALTER TABLE "Lease" ADD COLUMN "depositReturnedAmount" REAL;
ALTER TABLE "Lease" ADD COLUMN "depositReturnNote" TEXT;
ALTER TABLE "Lease" ADD COLUMN "depositReturnEmailSentAt" DATETIME;
