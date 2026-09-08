/*
  Warnings:

  - You are about to drop the column `projectId` on the `ProjectShareToken` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectShareToken" DROP CONSTRAINT "ProjectShareToken_projectId_fkey";

-- DropIndex
DROP INDEX "ProjectShareToken_projectId_revokedAt_idx";

-- AlterTable
ALTER TABLE "ProjectShareToken" DROP COLUMN "projectId",
ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "ShareTokenProject" (
    "id" UUID NOT NULL,
    "shareTokenId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "addedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareTokenProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareTokenProject_projectId_idx" ON "ShareTokenProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareTokenProject_shareTokenId_projectId_key" ON "ShareTokenProject"("shareTokenId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectShareToken_createdById_revokedAt_idx" ON "ProjectShareToken"("createdById", "revokedAt");

-- CreateIndex
CREATE INDEX "ProjectShareToken_revokedAt_createdAt_idx" ON "ProjectShareToken"("revokedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectShareToken" ADD CONSTRAINT "ProjectShareToken_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTokenProject" ADD CONSTRAINT "ShareTokenProject_shareTokenId_fkey" FOREIGN KEY ("shareTokenId") REFERENCES "ProjectShareToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTokenProject" ADD CONSTRAINT "ShareTokenProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTokenProject" ADD CONSTRAINT "ShareTokenProject_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
