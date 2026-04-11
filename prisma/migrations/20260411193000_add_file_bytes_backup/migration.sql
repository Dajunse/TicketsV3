-- Add DB-backed file payload as fallback for deployments where filesystem may be ephemeral.
ALTER TABLE "ActivityMaterial"
ADD COLUMN "fileBytes" BYTEA;

ALTER TABLE "Document"
ADD COLUMN "fileBytes" BYTEA;
