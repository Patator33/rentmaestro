-- Données nécessaires à la génération des baux et à leur signature (DocuSeal).
-- Uniquement des ADD COLUMN (aucune reconstruction de table) : les lignes existantes sont conservées.

-- Building : données du logement entier (colocation)
ALTER TABLE "Building" ADD COLUMN "surface" REAL;
ALTER TABLE "Building" ADD COLUMN "rooms" INTEGER;
ALTER TABLE "Building" ADD COLUMN "housingType" TEXT;
ALTER TABLE "Building" ADD COLUMN "legalRegime" TEXT;
ALTER TABLE "Building" ADD COLUMN "constructionYear" INTEGER;

-- Company : nom du bailleur sur le bail + email du signataire
ALTER TABLE "Company" ADD COLUMN "leaseDisplayName" TEXT;
ALTER TABLE "Company" ADD COLUMN "signerEmail" TEXT;

-- Tenant : état civil (locataire et colocataire)
ALTER TABLE "Tenant" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "Tenant" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "address" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "coTenantBirthDate" DATETIME;
ALTER TABLE "Tenant" ADD COLUMN "coTenantBirthPlace" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "coTenantAddress" TEXT;

-- Apartment : caractéristiques du logement
ALTER TABLE "Apartment" ADD COLUMN "rooms" INTEGER;
ALTER TABLE "Apartment" ADD COLUMN "floor" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "doorCode" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "cellarNumber" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "hasParking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Apartment" ADD COLUMN "housingType" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "legalRegime" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "constructionYear" INTEGER;
ALTER TABLE "Apartment" ADD COLUMN "heatingMode" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "hotWaterMode" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "commonEquipments" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "rentCapDecree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Apartment" ADD COLUMN "rentComplement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Apartment" ADD COLUMN "rentReferenceMajored" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Apartment" ADD COLUMN "rentReassessed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Apartment" ADD COLUMN "referenceRentPerM2" REAL;
ALTER TABLE "Apartment" ADD COLUMN "referenceRentMajoredPerM2" REAL;
ALTER TABLE "Apartment" ADD COLUMN "descPrivate" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "descCommon" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "descEquipment" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "chargesDetail" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "ictEquipment" TEXT;
ALTER TABLE "Apartment" ADD COLUMN "defaultLeaseType" TEXT;

-- Lease : type de bail, charges, durée, garant détaillé, statut de signature
ALTER TABLE "Lease" ADD COLUMN "leaseType" TEXT;
ALTER TABLE "Lease" ADD COLUMN "chargesMode" TEXT NOT NULL DEFAULT 'PROVISION';
ALTER TABLE "Lease" ADD COLUMN "durationMonths" INTEGER;
ALTER TABLE "Lease" ADD COLUMN "insurerName" TEXT;
ALTER TABLE "Lease" ADD COLUMN "rentRulesOverride" TEXT;
ALTER TABLE "Lease" ADD COLUMN "guarantorBirthDate" DATETIME;
ALTER TABLE "Lease" ADD COLUMN "guarantorBirthPlace" TEXT;
ALTER TABLE "Lease" ADD COLUMN "guarantorAddress" TEXT;
ALTER TABLE "Lease" ADD COLUMN "guarantorNationality" TEXT;
ALTER TABLE "Lease" ADD COLUMN "signatureStatus" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "docusealSubmissionId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "lastReminderAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "signedDocumentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignatureRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SignatureRequest_leaseId_idx" ON "SignatureRequest"("leaseId");
CREATE INDEX "SignatureRequest_docusealSubmissionId_idx" ON "SignatureRequest"("docusealSubmissionId");
