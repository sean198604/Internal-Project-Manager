-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MASTER', 'USER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'WAITING_ACCEPTANCE', 'COMPLETED', 'ARCHIVED', 'ON_HOLD', 'CANCELLED', 'MERGED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('NORMAL', 'AT_RISK', 'DELAYED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DEPRECATED', 'OFFLINE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DEPRECATED', 'OFFLINE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PARENT_CHILD', 'BRANCH', 'RELATED', 'MERGED', 'MIGRATED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('DOCUMENT', 'SCREENSHOT', 'DEPLOYMENT', 'REQUIREMENT', 'TESTING', 'ACCEPTANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('PROJECT_CREATED', 'STATUS_CHANGED', 'UPDATE_ADDED', 'OVERDUE_DETECTED', 'OWNER_CHANGED', 'DEPARTMENT_MIGRATED', 'PROJECT_MERGED', 'PROJECT_BRANCHED', 'COMPLETED', 'ACCEPTED', 'ARCHIVED', 'DOCUMENT_UPLOADED', 'VERSION_RELEASED', 'DEPLOYMENT_CHANGED', 'SHARE_CREATED', 'SHARE_REVOKED', 'RESTORED');

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "departmentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSequence" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "systemName" TEXT,
    "description" TEXT,
    "objective" TEXT,
    "requirement" TEXT,
    "acceptanceCriteria" JSONB,
    "departmentId" UUID NOT NULL,
    "projectTypeId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "originalDeveloperId" UUID,
    "currentMaintainerId" UUID,
    "priority" "Priority" NOT NULL DEFAULT 'P2',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'NORMAL',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE,
    "dueDate" DATE,
    "actualCompletedDate" DATE,
    "acceptanceDate" DATE,
    "acceptedById" UUID,
    "acceptanceNote" TEXT,
    "cancelledReason" TEXT,
    "allowDepartmentEdit" BOOLEAN NOT NULL DEFAULT false,
    "parentProjectId" UUID,
    "rootProjectId" UUID,
    "systemStatus" "SystemStatus" NOT NULL DEFAULT 'UNKNOWN',
    "currentVersion" TEXT,
    "offlinedAt" TIMESTAMP(3),
    "offlineReason" TEXT,
    "replacedByProjectId" UUID,
    "specialNotes" TEXT,
    "maintenanceNotes" TEXT,
    "handoverInfo" TEXT,
    "archiveCompleteness" INTEGER NOT NULL DEFAULT 0,
    "archiveConfirmedById" UUID,
    "archiveConfirmedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archivedById" UUID,
    "lastUpdateAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "progress" INTEGER,
    "status" "ProjectStatus",
    "healthStatus" "HealthStatus",
    "content" TEXT NOT NULL,
    "currentIssues" TEXT,
    "nextSteps" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "releaseDate" DATE,
    "changeNotes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAttachment" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "attachmentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "docType" "AttachmentType" NOT NULL,
    "category" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "documentGroupId" UUID NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeployment" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "environment" "Environment" NOT NULL,
    "serverName" TEXT,
    "serverIp" TEXT,
    "hostname" TEXT,
    "port" INTEGER,
    "protocol" TEXT DEFAULT 'http',
    "deploymentPath" TEXT,
    "serviceName" TEXT,
    "runtime" TEXT,
    "database" TEXT,
    "version" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "credentialLocation" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShareToken" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMigration" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "fromDepartmentId" UUID NOT NULL,
    "toDepartmentId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "migratedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMigration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMerge" (
    "id" UUID NOT NULL,
    "mergeBatchId" UUID NOT NULL,
    "targetProjectId" UUID NOT NULL,
    "sourceProjectId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "mergedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMerge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRelation" (
    "id" UUID NOT NULL,
    "fromProjectId" UUID NOT NULL,
    "toProjectId" UUID NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectArchiveChecklist" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itemKey" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "isAutoChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedById" UUID,
    "checkedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "ProjectArchiveChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTimelineEvent" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meta" JSONB,
    "actorId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changedFields" TEXT[],
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_isActive_sortOrder_idx" ON "Department"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectType_code_key" ON "ProjectType"("code");

-- CreateIndex
CREATE INDEX "ProjectType_isActive_sortOrder_idx" ON "ProjectType"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "Project_departmentId_idx" ON "Project"("departmentId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_projectTypeId_idx" ON "Project"("projectTypeId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_dueDate_idx" ON "Project"("dueDate");

-- CreateIndex
CREATE INDEX "Project_lastUpdateAt_idx" ON "Project"("lastUpdateAt");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "Project_parentProjectId_idx" ON "Project"("parentProjectId");

-- CreateIndex
CREATE INDEX "Project_rootProjectId_idx" ON "Project"("rootProjectId");

-- CreateIndex
CREATE INDEX "Project_status_dueDate_idx" ON "Project"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Project_deletedAt_status_updatedAt_idx" ON "Project"("deletedAt", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_createdAt_idx" ON "ProjectUpdate"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectUpdate_createdAt_idx" ON "ProjectUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_releaseDate_idx" ON "ProjectVersion"("projectId", "releaseDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_version_key" ON "ProjectVersion"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAttachment_storageKey_key" ON "ProjectAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "ProjectAttachment_checksum_idx" ON "ProjectAttachment"("checksum");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_docType_idx" ON "ProjectDocument"("projectId", "docType");

-- CreateIndex
CREATE INDEX "ProjectDocument_documentGroupId_isCurrent_idx" ON "ProjectDocument"("documentGroupId", "isCurrent");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_deletedAt_idx" ON "ProjectDocument"("projectId", "deletedAt");

-- CreateIndex
CREATE INDEX "ProjectDeployment_projectId_environment_idx" ON "ProjectDeployment"("projectId", "environment");

-- CreateIndex
CREATE INDEX "ProjectDeployment_serverIp_port_idx" ON "ProjectDeployment"("serverIp", "port");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDeployment_projectId_environment_serverIp_port_key" ON "ProjectDeployment"("projectId", "environment", "serverIp", "port");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShareToken_token_key" ON "ProjectShareToken"("token");

-- CreateIndex
CREATE INDEX "ProjectShareToken_projectId_revokedAt_idx" ON "ProjectShareToken"("projectId", "revokedAt");

-- CreateIndex
CREATE INDEX "ProjectMigration_projectId_createdAt_idx" ON "ProjectMigration"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectMerge_targetProjectId_idx" ON "ProjectMerge"("targetProjectId");

-- CreateIndex
CREATE INDEX "ProjectMerge_sourceProjectId_idx" ON "ProjectMerge"("sourceProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMerge_mergeBatchId_sourceProjectId_key" ON "ProjectMerge"("mergeBatchId", "sourceProjectId");

-- CreateIndex
CREATE INDEX "ProjectRelation_fromProjectId_relationType_idx" ON "ProjectRelation"("fromProjectId", "relationType");

-- CreateIndex
CREATE INDEX "ProjectRelation_toProjectId_relationType_idx" ON "ProjectRelation"("toProjectId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRelation_fromProjectId_toProjectId_relationType_key" ON "ProjectRelation"("fromProjectId", "toProjectId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectArchiveChecklist_projectId_itemKey_key" ON "ProjectArchiveChecklist"("projectId", "itemKey");

-- CreateIndex
CREATE INDEX "ProjectTimelineEvent_projectId_occurredAt_idx" ON "ProjectTimelineEvent"("projectId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectTimelineEvent_eventType_idx" ON "ProjectTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_originalDeveloperId_fkey" FOREIGN KEY ("originalDeveloperId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_currentMaintainerId_fkey" FOREIGN KEY ("currentMaintainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_archiveConfirmedById_fkey" FOREIGN KEY ("archiveConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_rootProjectId_fkey" FOREIGN KEY ("rootProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_replacedByProjectId_fkey" FOREIGN KEY ("replacedByProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "ProjectAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeployment" ADD CONSTRAINT "ProjectDeployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShareToken" ADD CONSTRAINT "ProjectShareToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShareToken" ADD CONSTRAINT "ProjectShareToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMigration" ADD CONSTRAINT "ProjectMigration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMigration" ADD CONSTRAINT "ProjectMigration_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMigration" ADD CONSTRAINT "ProjectMigration_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMigration" ADD CONSTRAINT "ProjectMigration_migratedById_fkey" FOREIGN KEY ("migratedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMerge" ADD CONSTRAINT "ProjectMerge_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMerge" ADD CONSTRAINT "ProjectMerge_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMerge" ADD CONSTRAINT "ProjectMerge_mergedById_fkey" FOREIGN KEY ("mergedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRelation" ADD CONSTRAINT "ProjectRelation_fromProjectId_fkey" FOREIGN KEY ("fromProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRelation" ADD CONSTRAINT "ProjectRelation_toProjectId_fkey" FOREIGN KEY ("toProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRelation" ADD CONSTRAINT "ProjectRelation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectArchiveChecklist" ADD CONSTRAINT "ProjectArchiveChecklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectArchiveChecklist" ADD CONSTRAINT "ProjectArchiveChecklist_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTimelineEvent" ADD CONSTRAINT "ProjectTimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTimelineEvent" ADD CONSTRAINT "ProjectTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
