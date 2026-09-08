-- 项目星级（0-5，0=未评分，仅 ADMIN/MASTER 可评）
ALTER TABLE "Project" ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 0;

-- 时间线事件类型新增 RATING_CHANGED
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'RATING_CHANGED';

-- 部门两级分类：先分「业务 / 职能」大类
CREATE TYPE "DepartmentCategory" AS ENUM ('BUSINESS', 'FUNCTION');
ALTER TABLE "Department" ADD COLUMN "category" "DepartmentCategory" NOT NULL DEFAULT 'BUSINESS';
UPDATE "Department" SET "category" = 'FUNCTION' WHERE "code" IN ('HR', 'ADMIN_OFFICE', 'BIZ_MGMT', 'FINANCE', 'DOCS', 'GM_OFFICE', 'TEST');
