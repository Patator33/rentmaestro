-- Coûts fixes de l'immeuble (crédit/assurance/taxe foncière), répartis entre
-- ses appartements. Démarrent à 0 : pas de migration automatique depuis les
-- valeurs saisies au niveau appartement, qui restent en repli si non rattaché.
ALTER TABLE "Building" ADD COLUMN "mortgageAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "insuranceAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Building" ADD COLUMN "taxAmount" REAL NOT NULL DEFAULT 0;
