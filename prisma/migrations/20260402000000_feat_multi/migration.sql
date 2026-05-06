-- AlterTable: Apartment - add availableFrom and soldAt
ALTER TABLE "Apartment" ADD COLUMN "availableFrom" DATETIME;
ALTER TABLE "Apartment" ADD COLUMN "soldAt" DATETIME;

-- AlterTable: Tenant - add isArchived
ALTER TABLE "Tenant" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: RentPayment - add paidAmount
ALTER TABLE "RentPayment" ADD COLUMN "paidAmount" REAL;

-- AlterTable: Task - add scheduledAt
ALTER TABLE "Task" ADD COLUMN "scheduledAt" DATETIME;

-- AlterTable: Company - add logoUrl
ALTER TABLE "Company" ADD COLUMN "logoUrl" TEXT;
