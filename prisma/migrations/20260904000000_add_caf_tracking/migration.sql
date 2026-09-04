-- AlterTable: Lease - montant CAF/APL mensuel attendu
ALTER TABLE "Lease" ADD COLUMN "cafMonthlyAmount" REAL;

-- AlterTable: RentPayment - part CAF du paiement + référence du virement groupé
ALTER TABLE "RentPayment" ADD COLUMN "cafAmount" REAL;
ALTER TABLE "RentPayment" ADD COLUMN "cafReference" TEXT;
