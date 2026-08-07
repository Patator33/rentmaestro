-- Charges communes mensuelles de l'immeuble, réparties entre ses appartements
-- dans le calcul du Cash Flow Net Net.
ALTER TABLE "Building" ADD COLUMN "expenseInternet" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseElectricity" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseWater" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseGas" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseMaintenance" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseAccountant" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseBank" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseCleaning" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "expenseOther" REAL NOT NULL DEFAULT 0;
