-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "rentAmount" REAL NOT NULL,
    "chargesAmount" REAL NOT NULL,
    "depositAmount" REAL,
    "depositPaidAmount" REAL,
    "depositStatus" TEXT,
    "depositReturnedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRentReviewDate" DATETIME,
    "guarantorType" TEXT,
    "guarantorFirstName" TEXT,
    "guarantorLastName" TEXT,
    "guarantorEmail" TEXT,
    "guarantorPhone" TEXT,
    "guarantorVisaleOk" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lease_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lease" ("apartmentId", "chargesAmount", "createdAt", "depositAmount", "depositPaidAmount", "depositReturnedAt", "depositStatus", "endDate", "id", "isActive", "lastRentReviewDate", "rentAmount", "startDate", "tenantId", "updatedAt") SELECT "apartmentId", "chargesAmount", "createdAt", "depositAmount", "depositPaidAmount", "depositReturnedAt", "depositStatus", "endDate", "id", "isActive", "lastRentReviewDate", "rentAmount", "startDate", "tenantId", "updatedAt" FROM "Lease";
DROP TABLE "Lease";
ALTER TABLE "new_Lease" RENAME TO "Lease";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
