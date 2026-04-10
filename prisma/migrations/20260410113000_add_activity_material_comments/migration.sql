-- AlterTable
ALTER TABLE "ActivityMaterial"
  ADD COLUMN "hasUnreadClientComment" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ActivityMaterialComment" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityMaterialComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityMaterial_activityId_hasUnreadClientComment_idx" ON "ActivityMaterial"("activityId", "hasUnreadClientComment");

-- CreateIndex
CREATE INDEX "ActivityMaterialComment_materialId_createdAt_idx" ON "ActivityMaterialComment"("materialId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityMaterialComment_authorId_createdAt_idx" ON "ActivityMaterialComment"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityMaterialComment" ADD CONSTRAINT "ActivityMaterialComment_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ActivityMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMaterialComment" ADD CONSTRAINT "ActivityMaterialComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
