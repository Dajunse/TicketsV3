-- CreateTable
CREATE TABLE "PublicationProposal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT,
    "approvedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reviewUrl" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicationProposal_clientId_createdAt_idx" ON "PublicationProposal"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "PublicationProposal_clientId_isApproved_idx" ON "PublicationProposal"("clientId", "isApproved");

-- CreateIndex
CREATE INDEX "PublicationProposal_scheduledFor_idx" ON "PublicationProposal"("scheduledFor");

-- AddForeignKey
ALTER TABLE "PublicationProposal" ADD CONSTRAINT "PublicationProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationProposal" ADD CONSTRAINT "PublicationProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationProposal" ADD CONSTRAINT "PublicationProposal_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
