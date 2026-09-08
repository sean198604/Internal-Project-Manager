# 01 · 产品架构与系统架构

> Internal-Project-Manager · 内部软件项目管理中心
> 版本：v1.0-architecture · 状态：待评审

---

## 1. 产品定位

一句话定位：

> **公司的软件项目生命周期 + 软件资产知识中心。**

不是 Todo App，不是 Jira Clone，不是 PLM。

### 1.1 最终成功标准（可验收）

一个完全不了解历史的新员工，打开本系统，搜索「采购管理系统」，**30 分钟内**能回答：

| # | 问题 | 数据来源 |
|---|------|---------|
| 1 | 它是什么？ | Project.description / systemName |
| 2 | 为什么做？ | Project.objective |
| 3 | 谁提出？ | Project.department + creator |
| 4 | 谁开发？谁负责？ | owner / originalDeveloper / currentMaintainer |
| 5 | 什么时候完成？ | actualCompletedDate / acceptanceDate |
| 6 | 验收了吗？ | acceptedBy / acceptanceNote |
| 7 | 现在还运行吗？ | Project.systemStatus |
| 8 | 运行在哪里？ | Deployment (Production) |
| 9 | 服务器 / 端口？ | serverIp / hostname / port |
| 10 | 什么版本？ | currentVersion + ProjectVersion[] |
| 11 | 怎么部署？ | maintenanceNotes.deploySteps |
| 12 | 有什么坑？ | specialNotes |
| 13 | 怎么维护？ | maintenanceNotes |
| 14 | 文档在哪？ | ProjectDocument[] |
| 15 | 出过什么问题？ | ProjectUpdate[] (issues) |
| 16 | 后来有没有继续开发？ | childProjects + lineage |

外加 AI 自然语言问答：
- 「我们以前有没有做过类似的系统？」
- 「这个系统怎么部署？」
- 「这个系统有什么坑？」
- 「后来有没有第二期？」

**约束：答案必须基于真实项目资料，不是 AI 猜测。无记录时明确回答「没有找到相关记录」。**

---

## 2. 三层产品模型

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3 · Knowledge + AI                               │
│  历史项目 → 可查询 / 可继承的知识资产                        │
│  AI Assistant · 全局搜索 · Source 引用 · 权限过滤           │
├─────────────────────────────────────────────────────────┤
│  Layer 2 · Project Archive                              │
│  已完成项目 → 软件资产沉淀                                  │
│  Archive · 完整度 · Checklist · Deployment · Docs · 维护    │
├─────────────────────────────────────────────────────────┤
│  Layer 1 · Active Projects                              │
│  现在正在做的事                                            │
│  需求 · 状态 · 进度 · 更新 · 风险 · 到期                     │
└─────────────────────────────────────────────────────────┘
```

**核心原则：项目完成 ≠ 项目消失。项目完成后，从「工作对象」转变为「软件资产」。**

闭环：

```
需求 → 项目 → 开发 → 更新 → 验收 → 完成 → 归档 → 资产
  ↑                                                  │
  └──── 版本 · 部署 · 文档 · 历史 · 分支 ←──────────────┘
```

---

## 3. 技术选型（已锁定）

遵循原则：**更稳定 > 更新潮；更简单 > 更强大；更好交接 > 更炫技。**

| 层 | 选型 | 版本 | 选择理由 |
|---|------|------|---------|
| 框架 | **Next.js** (App Router) | 15.x | RSC + Route Handlers 一体化，无需独立后端工程 |
| UI 运行时 | React | 19.x | Next 15 标配 |
| 语言 | TypeScript | 5.x | `strict: true` |
| 样式 | Tailwind CSS | **3.4**（非 v4） | Aceternity / shadcn 生态最稳；v4 破坏性变更多 |
| 组件底座 | shadcn/ui | latest | 复制源码、可改、无黑盒依赖 |
| 视觉参考 | Aceternity UI | 组件级复制 | 仅取 Sidebar / Tabs / Timeline / Tooltip / Modal / File Upload / Empty State |
| 动画 | framer-motion | 11.x | Aceternity 依赖；克制使用 |
| 数据获取 | TanStack Query | v5 | 客户端交互密集页（项目详情 / 更新流） |
| ORM | Prisma | 6.x | Migration 强约束，符合「每次结构变更必须出 migration」 |
| 数据库 | PostgreSQL | 16 | 本地 Docker 容器（仅 DB 容器化，应用仍本地跑） |
| 校验 | zod | 3.x | API 边界统一校验 |
| 认证 | 自研 JWT（jose） + httpOnly Cookie | jose 5.x | 不引入 NextAuth 复杂度，逻辑全掌控 |
| 密码 | bcryptjs | 2.x | 纯 JS，Windows 无 node-gyp 编译风险 |
| 时间 | date-fns + date-fns-tz | 4.x | UTC 存储 / Asia/Taipei 展示 |
| 富文本 | Markdown（轻量编辑器 + 预览） | — | 需求/目标字段；**不引入 Tiptap/Quill** |
| Markdown 渲染 | react-markdown + rehype-sanitize | — | 防 XSS |
| 图表 | **自绘 SVG / CSS** | — | 只需要数字卡片 + 简单分布，**不引入图表库** |
| 日志 | pino | 9.x | 结构化 JSON 日志 |
| 测试 | Vitest + Playwright | — | 单元/集成 + 权限安全 E2E |
| 代码规范 | ESLint + Prettier | — | — |

### 3.1 明确不引入

Redis · Kafka · ElasticSearch · Kubernetes · 微服务 · 消息队列 · 复杂 BI · 通知中心 · Gantt · Kanban 引擎

---

## 4. 本地开发环境结论（已实测）

| 项 | 实测结果 | 架构决策 |
|---|---------|---------|
| Node | v22.22.2 ✓ | 满足 Next 15 要求 |
| npm | 10.9.7 ✓ | 使用 npm（不引入 pnpm，减少变量） |
| Docker | 29.6.1 ✓ | **仅用于跑 PostgreSQL 容器** |
| psql (Windows) | 未安装 | 通过容器内 / Prisma 操作 |
| 端口 3000 | **被 Docker Desktop 占用** | ❌ 不可用 |
| 端口 7000–7010 | 被 Docker Desktop 代理占用 | ❌ 不可用（且属现有业务区，应避开） |
| 端口 5432 | **空闲 ✓** | PostgreSQL 映射 5432 |
| 端口 3001 / 3010 | 空闲 ✓ | **应用开发端口定为 3010** |
| FastGPT | `http://192.168.1.246:3000` → HTTP 200 ✓ | `FASTGPT_BASE_URL=http://192.168.1.246:3000/api` |

### 4.1 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| 应用 Dev | **3010** | 避开 3000 / 7000-7010 |
| PostgreSQL | **5432** | Docker 容器 `ipm-postgres` |

### 4.2 开发数据库

```bash
docker run -d --name ipm-postgres \
  -e POSTGRES_USER=ipm \
  -e POSTGRES_PASSWORD=ipm_dev_only \
  -e POSTGRES_DB=ipm \
  -p 5432:5432 \
  -v ipm_pgdata:/var/lib/postgresql/data \
  --health-cmd="pg_isready -U ipm" --health-interval=10s \
  postgres:16-alpine
```

> 应用本身**不做 Docker 化**（符合「开发阶段不优先 Docker 化」）。但 `Dockerfile` / `docker-compose.yml` 在 P1 阶段补齐，架构从第一天保持 Docker-ready（配置全走环境变量，无硬编码路径）。

---

## 5. 模块化单体架构（Modular Monolith）

### 5.1 分层

```
┌──────────────────────────────────────────────┐
│  Presentation  app/(routes) + components/     │
│  Next.js App Router · RSC · Client Components │
└───────────────────┬──────────────────────────┘
                    │ HTTP (Route Handlers) / Server Actions
┌───────────────────▼──────────────────────────┐
│  API Layer        app/api/**/route.ts         │
│  · zod 校验  · auth() 取会话  · 调用 service   │
│  **不含业务逻辑**                              │
└───────────────────┬──────────────────────────┘
┌───────────────────▼──────────────────────────┐
│  Service Layer    src/server/modules/*/       │
│  · 业务规则  · 事务  · 权限判定  · 审计埋点      │
│  **唯一业务规则所在层**                         │
└───────────────────┬──────────────────────────┘
┌───────────────────▼──────────────────────────┐
│  Data Layer       Prisma Client               │
│  · repository 封装  · 作用域查询（scope）       │
└───────────────────┬──────────────────────────┘
                    ▼
              PostgreSQL 16
```

**铁律：业务规则绝不写在页面组件里。** 页面组件只做渲染与交互。

### 5.2 模块划分

| 模块 | 职责 |
|------|------|
| `auth` | 登录 / 登出 / 会话 / 密码 Hash /  middleware 粗粒度守卫 |
| `authorization` | **统一权限服务**（唯一权限判定入口，项目与 AI 共用） |
| `users` | 用户 CRUD（ADMIN）/ 启停 / 重置密码 |
| `departments` | 部门 CRUD（ADMIN）/ 排序 / 停用 |
| `project-types` | 项目类型 CRUD（ADMIN）/ 排序 / 停用 |
| `projects` | 项目核心：CRUD / 状态机 / 进度 / 健康度 / 编号生成 / 软删除 |
| `project-updates` | 项目更新流（独立表）+ 关键字段变更记录 |
| `project-relations` | 父子 / 分支 / 关联 / 合并 / 迁移关系 |
| `lineage` | 谱系计算（ancestors / descendants / root） |
| `archives` | 归档档案 / 完整度计算 / Checklist / 软件资产卡 |
| `deployments` | 部署环境实体（多环境） |
| `documents` | 文档元数据 + 附件（DOCUMENT / SCREENSHOT / …） |
| `storage` | 存储抽象（LocalDriver → 预留 S3/MinIO） |
| `versions` | 系统版本 |
| `share` | 分享 Token 生成 / 撤销 / 分享页（权限仍走 authorization） |
| `search` | 全局搜索（权限过滤后） |
| `audit` | 审计日志写入与查询 |
| `ai` | AIProvider 抽象 / Context 构建 / 对话持久化 / 来源引用 |
| `settings` | 系统设置 / AI 配置 |
| `recycle-bin` | 回收站（恢复 / 彻底删除） |

---

## 6. 目录结构（Docker-ready）

```
Internal-Project-Manager/
├── app/                            # Next.js App Router
│   ├── (auth)/login/
│   ├── (workspace)/                # 需登录
│   │   ├── dashboard/
│   │   ├── projects/               # new / [id] / [id]/edit
│   │   ├── my-department/
│   │   ├── archive/                # [id]
│   │   ├── ai/
│   │   └── settings/               # users / departments / project-types / audit-logs / recycle-bin / ai
│   ├── share/[token]/              # 免登录，权限独立校验
│   └── api/                        # Route Handlers
│       ├── auth/  projects/  deployments/  documents/  ai/  search/  settings/  health/
├── src/
│   ├── server/
│   │   ├── modules/                # 上述 20 个模块
│   │   │   └── <module>/{service.ts,repository.ts,schema.ts}
│   │   ├── db/prisma.ts
│   │   ├── lib/{authz,audit,storage,logger,numbering,time,errors}.ts
│   │   └── ai/{provider.ts,providers/fastgpt.ts,context-builder.ts}
│   ├── components/
│   │   ├── ui/                     # shadcn
│   │   ├── aceternity/             # 复制的 Aceternity 组件（克制使用）
│   │   └── features/               # 业务组件
│   ├── hooks/  lib/  types/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── storage/                        # 本地文件存储（.gitignore）
├── scripts/backup.sh  scripts/restore.sh
├── docs/architecture/              # 本套文档
├── .env.example  .gitignore  README.md  ARCHITECTURE.md
├── Dockerfile  docker-compose.yml   # P1 补齐
```

---

## 7. 项目生命周期状态机

### 7.1 状态定义

| 状态 | 中文 | 含义 |
|------|------|------|
| `DRAFT` | 草稿 | 需求提出，信息未完整 |
| `PLANNED` | 待开始 | 已排期，未开工 |
| `IN_PROGRESS` | 进行中 | 开发中 |
| `WAITING_ACCEPTANCE` | 待验收 | 开发完成，等需求部门验收 |
| `COMPLETED` | 已完成 | **开发完成**，但档案未整理完整 |
| `ARCHIVED` | 已归档 | **已正式沉淀为公司软件资产** |
| `ON_HOLD` | 暂停 | 异常态 |
| `CANCELLED` | 取消 | 异常态 |
| `MERGED` | 已合并 | 被并入他项目，**不可物理删除** |

### 7.2 状态流转（合法迁移表）

| From ↓ / To → | DRAFT | PLANNED | IN_PROGRESS | WAITING_ACCEPT | COMPLETED | ARCHIVED | ON_HOLD | CANCELLED | MERGED |
|---|---|---|---|---|---|---|---|---|---|
| **DRAFT** | — | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| **PLANNED** | ✓ | — | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| **IN_PROGRESS** | ✗ | ✓ | — | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **WAITING_ACCEPTANCE** | ✗ | ✗ | ✓ | — | ✓ | ✗ | ✓ | ✓ | ✓ |
| **COMPLETED** | ✗ | ✗ | ✓ | ✓ | — | ✓ | ✗ | ✗ | ✗ |
| **ARCHIVED** | ✗ | ✗ | ✗ | ✗ | ✓(取消归档) | — | ✗ | ✗ | ✗ |
| **ON_HOLD** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | — | ✓ | ✓ |
| **CANCELLED** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | — | ✗ |
| **MERGED** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | — |

规则：
1. **未纳入白名单的迁移一律 409 拒绝**，由 `ProjectStateMachine` 单点判定。
2. `COMPLETED → ARCHIVED` 需通过归档门槛（见 §9.3）。
3. `MERGED` 为终态，仅 ADMIN 可在事务中解除（并记录审计）。
4. 每次状态变更：**写 audit_log + 写 project_timeline_event + 写 field_change_log**（若在监控字段列表内）。

### 7.3 派生状态（**不存库，运行时计算**）

| 派生态 | 计算规则 | 展示 |
|--------|---------|------|
| **OVERDUE 延期** | `today > dueDate` 且 `status ∉ {COMPLETED, ARCHIVED, CANCELLED, MERGED}` | 红标 + 延期天数 |
| **DUE_SOON 即将到期** | `0 ≤ dueDate - today ≤ 7 天` 且未完成 | 黄标 |
| **STALE 长期未更新** | `status = IN_PROGRESS` 且 `now - 最近一条 ProjectUpdate.createdAt > 7 天` | 灰标 + 天数 |

> 派生态统一由 `src/server/modules/projects/derivation.ts` 计算，**前端不得自行判断**，避免规则漂移。

### 7.4 健康状态（与进度分离）

| 值 | 中文 | 说明 |
|---|------|------|
| `NORMAL` | 正常 | 默认 |
| `AT_RISK` | 有风险 | 手工标记 |
| `DELAYED` | 延期 | 手工或 overdue 自动建议 |
| `ON_HOLD` | 暂停 | 跟随 ON_HOLD 状态 |

例：进度 80% + 健康状态「延期」是合法组合。**健康状态与 progress 是两个独立维度，互不推导。**

---

## 8. 项目谱系模型（Lineage）

### 8.1 概念

```
Root Project（根）
PRJ-2024-0007  采购管理系统 v1
   │
   ├── PRJ-2025-0031  采购报表升级        [PARENT_CHILD]
   │      └── PRJ-2026-0003  采购审批优化  [PARENT_CHILD]
   └── PRJ-2026-0018  供应商评分系统       [BRANCH]
```

- `parentProjectId`：直接父项目
- `rootProjectId`：谱系根（冗余字段，避免递归查询），无父时指向自身
- `project_relations`：关系表，支持 `PARENT_CHILD` / `BRANCH` / `RELATED` / `MERGED` / `MIGRATED`（后两者预留）

### 8.2 从历史项目创建新项目（Branch）

自动继承：
- `parentProjectId` = 源项目 id
- `rootProjectId` = 源项目 `rootProjectId`（若源为根则 = 源 id）
- `departmentId` / `projectTypeId`
- 历史背景（写入 description 引用，并生成一条 `BRANCH` 关系）

**必须重新填写**：项目名称、需求、负责人、优先级、开始日期、预计完成日期。

> 不做「复制成完全相同项目」的一键克隆。目标是**继承背景，不是复制记录**。

### 8.3 查询

- `GET /api/projects/:id/lineage` 返回 `{ ancestors: [], current: {}, descendants: [] }`
- `descendants` 用 CTE 递归查询（PostgreSQL `WITH RECURSIVE`），深度上限 10 防环

---

## 9. 归档模型（Archive）

### 9.1 COMPLETED vs ARCHIVED

| | COMPLETED | ARCHIVED |
|---|-----------|----------|
| 含义 | 开发完成了 | 已沉淀为公司软件资产 |
| 档案 | 可能不完整 | 应完整（但不强制 100%） |
| 可编辑 | ✓ | 需「取消归档」或直接补充（ADMIN/MASTER） |
| 出现在 | 项目列表（已完成区） | Archive |

### 9.2 归档档案内容

```
Archive
├── 项目简介 / 项目目标 / 业务价值
├── 需求 & 验收结果（acceptedBy, acceptanceDate, acceptanceNote）
├── 系统信息（systemName, currentVersion, systemStatus）
├── 部署信息（Deployment[]）
├── 文档（Document[] / Screenshot[]）
├── 版本历史（ProjectVersion[]）
├── 特殊注意事项（specialNotes）
├── 维护说明（maintenanceNotes）
├── 交接信息（handoverInfo）★
├── 历史更新（ProjectUpdate[]）
└── 后续项目（childProjects）
```

### 9.3 归档完整度（Archive Completeness）

9 项 checklist 加权：

| # | 项 | 权重 | 判定 |
|---|---|------|------|
| 1 | 项目需求完整 | 15 | `requirement` 非空且 ≥ 50 字 |
| 2 | 验收信息完整 | 10 | `acceptedBy` + `acceptanceDate` 非空 |
| 3 | 部署信息完整 | 15 | 至少 1 条 Deployment |
| 4 | 当前版本完整 | 10 | `currentVersion` 非空 |
| 5 | 文档已提交 | 15 | 至少 1 条 DOCUMENT 附件 |
| 6 | 截图已提交 | 10 | 至少 1 条 SCREENSHOT 附件 |
| 7 | 特殊注意事项已记录 | 10 | `specialNotes` 非空 |
| 8 | 维护方式已记录 | 10 | `maintenanceNotes` 非空 |
| 9 | 负责人已确认 | 5 | `archiveConfirmedBy` 非空 |

- 总分 100，随数据变更**实时重算并缓存到 `projects.archiveCompleteness`**（写入时触发重算，非定时）。
- **允许 COMPLETED 但档案不完整**（如 61%），列表/详情页显示 `⚠️ 档案未完成`。
- **归档门槛**：不强制 100%，但 < 60% 时归档需二次确认并记录原因。

### 9.4 软件资产卡（Software Asset Card）

归档项目顶部展示：

```
┌─ Software Asset ────────────────────────────────┐
│  Sales Quote System                    [运行中]  │
│  当前版本 v2.1 · 环境 Production                  │
│  负责人 张三 · 维护人 李四                         │
│  完成 2026-03-12 · 最后维护 2026-08-01            │
│  档案完整度 ████████░░ 82%                        │
└──────────────────────────────────────────────────┘
```

### 9.5 系统状态（独立于项目状态）

`ACTIVE` / `MAINTENANCE` / `DEPRECATED` / `OFFLINE` / `UNKNOWN`

> 项目完成 ≠ 系统仍在线。

下线记录：`offlinedAt` + `offlineReason` + `replacedByProjectId`

---

## 10. 部署模型（Deployment）

### 10.1 为什么是独立实体

一个项目可能同时存在：

| 环境 | 服务器 | 端口 |
|------|-------|------|
| Development | Server A | 8081 |
| Testing | Server B | 8082 |
| Production | Server C | 8080 |

**因此绝不把 serverIp/port 放进 projects 表。**

### 10.2 字段

`environment` · `serverName` · `serverIp` · `hostname` · `port` · `protocol` · `deploymentPath` · `serviceName` · `runtime` · `database` · `version` · `status` · `notes` · `lastVerifiedAt`

### 10.3 安全红线

**禁止保存**：服务器密码 · SSH 私钥 · 数据库密码 · API Key · Token · Secret

**允许保存**：`credentialLocation`——「凭证存放在哪里」（如：公司密码管理工具 / 由 IT 管理员维护）

实现层面：
- 表单与 schema 明确标注禁止字段
- 提交时 zod 正则黑名单拦截（如匹配 `password\s*[:=]`、`BEGIN.*PRIVATE KEY`）
- 命中时**拒绝提交 + 写审计日志**

### 10.4 权限

Deployment 属内部技术信息：**ADMIN / MASTER 可见；USER 默认不可见**（即使项目属于该用户所在部门）。

---

## 11. 文档模型

### 11.1 分类

`DOCUMENT` · `SCREENSHOT` · `DEPLOYMENT` · `REQUIREMENT` · `TESTING` · `ACCEPTANCE` · `OTHER`

用途细分：需求文档 / 开发文档 / 部署文档 / 操作说明 / 测试报告 / 验收资料 / 会议记录 / 其他

### 11.2 存储

```
数据库：metadata（文件名/类型/版本/上传人/是否当前版本）
        + storageKey（安全随机名）
磁盘：  storage/<yyyy>/<mm>/<uuid>.<ext>
```

- **不使用原始文件名作为 storage path**（防路径穿越 + 重名）
- 下载走 `GET /api/documents/:id/download` → **服务端鉴权后重定向/流式返回**，不暴露真实路径
- 预留 `StorageDriver` 接口：`LocalDriver` → 未来 `S3Driver` / `MinioDriver`

### 11.3 限制

| 项 | 值 |
|---|---|
| 单文件上限 | 20 MB（可配置 `MAX_UPLOAD_SIZE_MB`） |
| 允许类型 | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md, csv, png, jpg, jpeg, gif, webp, svg, zip |
| 校验层级 | MIME + 扩展名 + magic number（防伪装） |

### 11.4 版本

同一 `documentGroupId` 下多版本：`version` + `isCurrent`（唯一当前版本，事务内切换）

---

## 12. 关键横切设计

### 12.1 项目编号

`PRJ-YYYY-NNNN`，由数据库序列 + 事务生成：

```sql
-- project_sequence 表，行锁保证并发唯一
INSERT INTO project_sequence(year, last_value) VALUES (2026, 1)
ON CONFLICT (year) DO UPDATE SET last_value = project_sequence.last_value + 1
RETURNING last_value;
```

> 不用 DB 自增 id 作为编号；不用 `SELECT MAX()+1`（并发不安全）。

### 12.2 时间与时区

- 数据库：**UTC**（`timestamptz`）
- 业务显示：**Asia/Taipei**（`APP_TIMEZONE` 环境变量，默认 `Asia/Taipei`）
- 日期字段（startDate/dueDate）用 `date` 类型（无时区），展示不转换
- 时间戳字段用 `timestamptz`，展示时统一 `formatInTimeZone()`

### 12.3 审计日志

记录动作：`LOGIN` / `PROJECT_CREATE` / `PROJECT_UPDATE` / `PROJECT_DELETE` / `ARCHIVE` / `UNARCHIVE` / `MIGRATE` / `MERGE` / `BRANCH` / `SHARE_CREATE` / `SHARE_REVOKE` / `DOC_UPLOAD` / `DEPLOYMENT_CHANGE` / `FIELD_CHANGE` / `AI_CONFIG_CHANGE`

记录内容：`userId` · `action` · `entity` · `entityId` · `timestamp` · `before` · `after` · `ip` · `userAgent`

**禁止记录**：password · apiKey · secret · token

### 12.4 事务边界（必须包裹）

项目合并 · 项目迁移 · 项目归档 · 项目恢复 · 分支创建 · 关键状态变更 · 文档版本切换 · 分享 Token 轮换

### 12.5 错误处理

- 生产环境统一返回：`{ error: { code, message: "操作失败，请稍后重试" } }`
- 真实错误 + stack 写入服务端日志（pino），**绝不下发 SQL / 路径 / Token**
- 自定义 `AppError` 分层：`ValidationError(400)` / `AuthError(401)` / `ForbiddenError(403)` / `NotFoundError(404)` / `ConflictError(409)`

---

## 13. 架构决策记录（ADR 摘要）

| # | 决策 | 理由 | 备选（未采用） |
|---|------|------|--------------|
| ADR-01 | 模块化单体 | 2 人团队、低访问量；微服务运维成本远超收益 | 微服务 / K8s |
| ADR-02 | Tailwind 3.4 而非 v4 | Aceternity + shadcn 生态稳定性优先 | Tailwind v4 |
| ADR-03 | 自研 JWT 而非 NextAuth | 逻辑全掌控、依赖少、无黑盒 | Auth.js v5 |
| ADR-04 | 数据库容器化、应用不容器化（开发期） | 用户明确要求；DB 用容器避免污染本机 | 全容器化 |
| ADR-05 | 需求字段用 Markdown 而非富文本编辑器 | 克制、无 XSS 面、易存储易检索 | Tiptap / Quill |
| ADR-06 | 不引入图表库 | 只需数字卡片 + 简单分布，自绘更少依赖 | Recharts / ECharts |
| ADR-07 | 派生状态（延期/到期/未更新）后端统一计算 | 防止前端规则漂移 | 前端计算 |
| ADR-08 | AI 采用 Context Injection 而非 FastGPT 知识库同步 | 权限 100% 自控、无数据驻留共享实例风险（详见 06） | 知识库同步 |
| ADR-09 | 端口 3010 | 3000/7000-7010 均被占用 | 3000 |
