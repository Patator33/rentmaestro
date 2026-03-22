-- Add file upload fields to Inspection
ALTER TABLE "Inspection" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "Inspection" ADD COLUMN "fileName" TEXT;
