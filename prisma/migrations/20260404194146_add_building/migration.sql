-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Building_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Apartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "complement" TEXT,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "rent" REAL NOT NULL,
    "charges" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "comment" TEXT,
    "mortgageAmount" REAL,
    "insuranceAmount" REAL,
    "taxAmount" REAL,
    "defaultDeposit" REAL,
    "availableFrom" DATETIME,
    "soldAt" DATETIME,
    "companyId" TEXT,
    "buildingId" TEXT,
    CONSTRAINT "Apartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Apartment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Apartment" ("address", "availableFrom", "charges", "city", "comment", "companyId", "complement", "createdAt", "defaultDeposit", "description", "id", "insuranceAmount", "mortgageAmount", "name", "rent", "soldAt", "taxAmount", "updatedAt", "zipCode") SELECT "address", "availableFrom", "charges", "city", "comment", "companyId", "complement", "createdAt", "defaultDeposit", "description", "id", "insuranceAmount", "mortgageAmount", "name", "rent", "soldAt", "taxAmount", "updatedAt", "zipCode" FROM "Apartment";
DROP TABLE "Apartment";
ALTER TABLE "new_Apartment" RENAME TO "Apartment";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
