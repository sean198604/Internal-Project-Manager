import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// 真实组织（外贸公司，无采购部）
const DEPARTMENTS = [
  { code: 'FESTIVAL', name: '节日事业部' },
  { code: 'OUTDOOR', name: '户外事业部' },
  { code: 'ECOMMERCE', name: '电商事业部' },
  { code: 'SEA_SUPPLY', name: '东南亚供应链' },
  { code: 'JP_GOODS', name: '日语百货部' },
  { code: 'KITCHEN', name: '餐厨业务部' },
  { code: 'MOBILE_LIGHT', name: '移动光源部' },
  { code: 'JAPAN', name: '日本事业部' },
  { code: 'SHANGHAI', name: '上海事业部' },
  { code: 'HR', name: '人力资源部' },
  { code: 'ADMIN_OFFICE', name: '行政管理部' },
  { code: 'BIZ_MGMT', name: '业务管理部' },
  { code: 'FINANCE', name: '财务部' },
  { code: 'DOCS', name: '单证部' },
  { code: 'GM_OFFICE', name: '总经理室' },
];

const PROJECT_TYPES = [
  { code: 'FEATURE', name: '新功能' },
  { code: 'OPTIMIZE', name: '功能优化' },
  { code: 'BUGFIX', name: 'Bug 修复' },
  { code: 'REPORT', name: '报表' },
  { code: 'AUTOMATION', name: '自动化' },
  { code: 'INTEGRATION', name: '系统整合' },
  { code: 'OTHER', name: '其他' },
];

async function main() {
  console.log('→ Seeding Internal-Project-Manager (clean)...');

  // ── Departments ──────────────────────────────────
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const d = DEPARTMENTS[i]!;
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, sortOrder: i + 1 },
      create: { code: d.code, name: d.name, sortOrder: i + 1 },
    });
  }
  console.log(`  ✓ departments: ${DEPARTMENTS.length}`);

  // ── Project types ────────────────────────────────
  for (let i = 0; i < PROJECT_TYPES.length; i++) {
    const t = PROJECT_TYPES[i]!;
    await prisma.projectType.upsert({
      where: { code: t.code },
      update: { name: t.name, sortOrder: i + 1 },
      create: { code: t.code, name: t.name, sortOrder: i + 1 },
    });
  }
  console.log(`  ✓ project types: ${PROJECT_TYPES.length}`);

  // ── Users（仅 admin，其余账号在设置页创建） ─────
  const adminPassword = await bcrypt.hash(required('ADMIN_INITIAL_PASSWORD'), BCRYPT_COST);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword, isActive: true, deletedAt: null },
    create: {
      username: 'admin',
      displayName: '系统管理员',
      passwordHash: adminPassword,
      role: 'ADMIN',
      departmentId: null,
    },
  });
  console.log('  ✓ users: admin (其余账号请在 设置 → 用户管理 中创建)');

  // ── Project sequence ─────────────────────────────
  const year = new Date().getFullYear();
  await prisma.projectSequence.upsert({
    where: { year },
    update: { lastValue: 0 },
    create: { year, lastValue: 0 },
  });
  console.log(`  ✓ sequence ${year} reset to 0`);

  console.log('→ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
