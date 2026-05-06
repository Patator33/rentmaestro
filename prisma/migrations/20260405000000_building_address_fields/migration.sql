-- AlterTable: Building - split address into street + zipCode + city
ALTER TABLE "Building" ADD COLUMN "zipCode" TEXT;
ALTER TABLE "Building" ADD COLUMN "city" TEXT;
