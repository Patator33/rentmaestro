-- Add isPersonal flag to Company
ALTER TABLE "Company" ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT 0;

-- CompanyDocument table
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'AUTRE',
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- GlobalDocument table
CREATE TABLE "GlobalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'AUTRE',
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
