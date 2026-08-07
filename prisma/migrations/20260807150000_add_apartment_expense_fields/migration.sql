-- Charges communes mensuelles au niveau appartement : servent de repli tant
-- que l'immeuble ne renseigne pas le même poste (auquel cas sa quote-part
-- prévaut). Permet un mix immeuble/appartement poste par poste.
ALTER TABLE "Apartment" ADD COLUMN "expenseInternet" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseElectricity" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseWater" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseGas" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseMaintenance" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseAccountant" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseBank" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseCleaning" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "expenseOther" REAL NOT NULL DEFAULT 0;
