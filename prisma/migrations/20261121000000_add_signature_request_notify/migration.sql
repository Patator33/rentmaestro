-- Demande de signature : invitations envoyées par email (true) ou liens transmis à la main (false).
ALTER TABLE "SignatureRequest" ADD COLUMN "notify" BOOLEAN NOT NULL DEFAULT true;
