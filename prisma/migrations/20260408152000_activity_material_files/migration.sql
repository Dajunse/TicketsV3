-- AlterTable
ALTER TABLE "ActivityMaterial"
  ADD COLUMN "fileStoragePath" TEXT,
  ADD COLUMN "filePublicUrl" TEXT,
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "fileMimeType" TEXT,
  ADD COLUMN "fileSizeBytes" INTEGER;

-- Drop unique index to allow repeated material names in one activity
DROP INDEX IF EXISTS "ActivityMaterial_activityId_name_key";
