# P0 范围定义

> **核心目标：把 Internal-Project-Manager 的项目管理与软件资产能力做成真正可用的 V1。**
> AI / FastGPT 已降为 **P2**，本文档不涉及。

---

## 1. P0 产品范围

### A. 项目管理

| # | 能力 | 说明 |
|---|------|------|
| A1 | 项目创建 | `PRJ-YYYY-NNNN` 自动生成（序列表 + 行锁） |
| A2 | 项目列表 | Table 视图，分页 / 搜索 / 筛选 / 排序 |
| A3 | 项目详情 | 第一屏直达关键信息 |
| A4 | 项目状态 | 9 态状态机，非法迁移拒绝 |
| A5 | 项目进度 | 0–100%，与健康状态**相互独立** |
| A6 | 项目负责人 | owner / creator / developer / maintainer 四类分离 |
| A7 | 需求部门 | Department 数据库化 |
| A8 | 项目类型 | 7 种默认类型，可维护 |
| A9–A12 | 日期 | 开始 / 预计完成 / 实际完成 / 验收日期 |
| A13 | 优先级 | P0–P3，默认 P2 |
| A14 | 健康状态 | 正常 / 有风险 / 延期 / 暂停 |
| A15 | 项目需求 | Markdown 多行 |
| A16 | 项目目标 | Objective |
| A17 | 验收标准 | Checklist `[{text, done}]` |
| A18 | Project Updates | 独立表，含进度/状态快照、问题、下一步 |

### B. 项目管理能力

| # | 能力 | 说明 |
|---|------|------|
| B1 | 搜索 | 编号 / 项目名 / 系统名 / 描述 |
| B2 | 筛选 | 部门 / 类型 / 负责人 / 状态 / 健康 / 优先级 / 日期 |
| B3 | 排序 | 最近更新 / 预计完成 / 创建时间 / 优先级 |
| B4 | Dashboard | 数字卡片 + 需关注列表（**不引入图表库**） |
| B5 | 延期自动识别 | 派生状态，**不存库**，后端统一计算 |
| B6 | 长期未更新识别 | 进行中且 > 7 天无更新 |
| B7 | 项目历史 | 关键字段变更（前值 / 后值 / 人 / 时间 / 原因） |
| B8 | 权限控制 | Server-side Authorization |

### C. 已完成项目与软件资产

| # | 能力 | 说明 |
|---|------|------|
| C1–C2 | Completed / Archived | **两者语义严格区分** |
| C3 | Archive Checklist | 9 项，自动判定 + 人工勾选 |
| C4 | Archive Completeness | 9 项加权，允许 < 100% 归档 |
| C5 | 软件系统名称 | `systemName`，与项目名解耦 |
| C6 | 软件版本 | `currentVersion` + `ProjectVersion[]` |
| C7 | 当前维护人 | `currentMaintainerId` |
| C8–C14 | Deployment | environment / serverName / serverIp / hostname / port / runtime / database |
| C15 | 特殊注意事项 | `specialNotes`（有什么坑） |
| C16 | 维护说明 | `maintenanceNotes`（怎么维护） |
| C17–C18 | 文档 / 截图 | 基础上传 + 分类展示 |
| C19 | 软件资产状态 | ACTIVE / MAINTENANCE / DEPRECATED / OFFLINE / UNKNOWN |

### D. 项目谱系

| # | 能力 | 说明 |
|---|------|------|
| D1–D3 | Parent / Child / Branch | `project_relations` + `parentProjectId` |
| D4 | Project Lineage | `rootProjectId` 冗余字段，CTE 递归查询 |
| D5 | 从旧项目创建新项目 | 继承背景，**重填关键字段**，非克隆 |
| D6–D7 | 项目合并 / 迁移 | 事务 + 完整记录 |
| D8–D9 | Merge / Migration History | append-only |

### E. 分享与权限

| # | 能力 | 说明 |
|---|------|------|
| E1 | 部门权限 | USER 仅见本部门 |
| E2 | 项目分享 | 随机 Token，可撤销 |
| E3 | Server-side authorization | 单一 `authz.ts` |
| E4 | 普通用户隔离 | 越权返回 **404**（非 403） |
| E5 | ADMIN / MASTER | 查看全部项目 |

---

## 2. P0 数据模型（17 张表）

| 表 | 用途 |
|---|------|
| `departments` | 需求部门 |
| `users` | 用户 |
| `project_types` | 项目类型 |
| `project_sequence` | 编号序列（行锁） |
| **`projects`** | **核心对象** |
| `project_updates` | 更新流 |
| `project_versions` | 系统版本 |
| `project_deployments` | 多环境部署 |
| `project_attachments` | 物理文件（storageKey 随机化） |
| `project_documents` | 文档元数据 |
| `project_relations` | 关系（PARENT_CHILD/BRANCH/RELATED/MERGED/MIGRATED） |
| `project_merges` | 合并记录（append-only） |
| `project_migrations` | 迁移记录（append-only） |
| `project_archive_checklists` | 归档 9 项 |
| `project_timeline_events` | 时间线 |
| `project_share_tokens` | 分享 Token |
| `audit_logs` | 审计 |

> **P0 不建 AI 相关表**（`ai_conversations` / `ai_messages` / `knowledge_sources` / `ai_settings`），P2 时单独 migration 添加。

### 关键设计

- **派生状态不存库**：延期 / 即将到期 / 长期未更新由 `derivation.ts` 计算
- **软删除**：`deletedAt`，历史项目不可物理删除
- **MERGED 为终态**：不可编辑、不可物理删除
- **禁止存凭证**：Deployment 只允许记「凭证存放在哪里」

---

## 3. P0 页面结构

```
/login
/share/[token]                  免登录 · 剥离内部信息
/(workspace)
  /dashboard                    数字卡片 + 需关注
  /projects                     列表（Table）
  /projects/new
  /projects/[id]                Overview·Updates·Documents·Deployment·Timeline·Lineage·History
  /my-department
  /archive                      ADMIN / MASTER
  /archive/[id]                 Software Asset Card + Checklist
  /settings/users                ADMIN
  /settings/departments          ADMIN
  /settings/project-types        ADMIN
```

**无 AI 页面。**

---

## 4. P0 API

| 方法 | 路径 | 权限 |
|---|---|---|
| GET | `/api/health` | 公开 |
| POST | `/api/auth/login` · `/logout` · GET `/me` | — |
| GET/POST | `/api/projects` | 登录 |
| GET/PATCH/DELETE | `/api/projects/:id` | Scope |
| GET | `/api/projects/stats` | 登录 |
| GET/POST | `/api/projects/:id/updates` | Scope |
| GET | `/api/projects/:id/timeline` · `/history` · `/lineage` | Scope / History 限 ADMIN·MASTER |
| POST | `/api/projects/:id/accept` · `/archive` · `/unarchive` | ADMIN·MASTER |
| POST | `/api/projects/:id/branch` · `/merge` · `/migrate` | ADMIN·MASTER |
| GET/POST | `/api/projects/:id/deployments` | **ADMIN·MASTER** |
| PATCH/DELETE | `/api/deployments/:id` | ADMIN·MASTER |
| GET/POST | `/api/projects/:id/documents` | Scope |
| GET | `/api/documents/:id/download` | Scope（服务端流式） |
| GET/POST | `/api/projects/:id/versions` · PATCH/DELETE `/api/versions/:id` | Scope / ADMIN·MASTER |
| POST/GET/DELETE | `/api/projects/:id/share` · `/share/rotate` · GET `/api/share/:token` | ADMIN·MASTER / 公开 |
| GET | `/api/search` | 登录（Scope 过滤） |
| GET/POST | `/api/departments` · `/api/project-types` · `/api/users` | ADMIN |
| PATCH/DELETE | `/api/departments/:id` · `/api/project-types/:id` · `/api/users/:id` | ADMIN |

**无 AI 端点。**

---

## 5. P0 权限

| 能力 | ADMIN | MASTER | USER |
|---|:---:|:---:|:---:|
| 查看全部项目 | ✅ | ✅ | ❌ |
| 查看本部门项目 | ✅ | ✅ | ✅ |
| 创建项目 | ✅ | ✅ | ✅ |
| 编辑项目 | ✅ | ✅ | owner/creator 或部门协作开启 |
| 关键字段变更（状态/健康/负责人/优先级/进度/到期） | ✅ | ✅ | ❌ |
| 添加更新 | ✅ | ✅ | owner/creator |
| 验收 / 归档 / 迁移 / 合并 | ✅ | ✅ | ❌ |
| **查看 Deployment / 维护说明 / 特殊注意事项 / 内部文档 / History** | ✅ | ✅ | **❌** |
| 管理文档 | ✅ | ✅ | 按写权限 |
| 分享链接 | ✅ | ✅ | ❌ |
| 用户 / 部门 / 项目类型管理 | ✅ | ❌ | ❌ |

**实现铁律**

1. 单一入口 `authz.ts`，业务层不得自行判权限
2. Scope **注入查询条件**（先过滤后查询，不是先查后过滤）
3. 越权统一 **404**
4. 序列化层字段裁剪（USER 响应里根本不含 deployment / notes）
5. USER 即使项目属本部门，也**看不到** Deployment

---

## 6. P0 开发顺序

每个 Phase 必须：**运行 → 测试 → 修复 → 确认**，再进下一阶段。

| Phase | 内容 | 验收 |
|---|---|---|
| **0** | 地基：Next.js + Tailwind + Prisma + PG + `/api/health` | 页面可打开，health 三项绿 |
| **1** | 认证 + 权限内核：登录 / 会话 / `authz.ts` / 中间件 | admin·master·user 登录，越权 404 |
| **2** | 项目 CRUD + 列表：编号生成 / 筛选 / 排序 / 分页 | 创建→列表可见，USER 只见本部门 |
| **3** | 项目详情 + Updates + 历史 + 时间线 | 更新流可写，变更有记录 |
| **4** | Dashboard + 全局搜索 | 延期/未更新正确显示 |
| **5** | 归档 + 软件资产：Checklist / 完整度 / 部署 / 版本 / 文档 / 截图 | 可归档，完整度实时计算 |
| **6** | 谱系 + 合并 + 迁移 | 分支/合并/迁移事务正确，历史可查 |
| **7** | 分享 + 权限收口 + 加固 | 20 条安全用例全通过 |

---

## 明确不做（P0）

- AI / FastGPT 任何功能与数据表
- 文档版本管理（P0 仅基础上传 + `version` 字段）
- 通知中心 / Webhook
- 导出 / 批量导入
- Kanban / Gantt
- 图表库（Dashboard 用数字卡片 + 自绘条形）
- 回收站 UI（P0 仅软删除，P1 补恢复）
