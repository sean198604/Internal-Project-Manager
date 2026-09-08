# Internal-Project-Manager · 架构总览

**内部软件项目管理中心** — 公司的软件项目生命周期与软件资产知识中心。

> 状态：架构设计已完成，**等待确认后开始编码**。

---

## 一页纸总览

```
定位：项目生命周期 + 软件资产 + 知识继承 + AI 问答
   不是 Todo App / Jira Clone / PLM

三层模型：
  Layer 1  Active Projects    现在在做什么
  Layer 2  Project Archive    做完的沉淀为软件资产
  Layer 3  Knowledge + AI     历史可查询可继承

技术栈（已锁定）：
  Next.js 15 (App Router) · React 19 · TypeScript strict
  Tailwind 3.4 · shadcn/ui · Aceternity（克制取用）· framer-motion
  Prisma 6 · PostgreSQL 16 · TanStack Query v5
  自研 JWT(jose) + httpOnly Cookie · bcryptjs · zod · pino

架构形态：Modular Monolith（模块化单体）
  零中间件依赖：无 Redis / Kafka / ES / K8s / 微服务

环境（已实测）：
  应用端口 3010（3000 与 7000-7010 已被 Docker Desktop 占用）
  PostgreSQL 5432（Docker 容器，仅 DB 容器化）
  FastGPT http://192.168.1.246:3000/api  → HTTP 200 ✓
```

---

## 文档地图

| # | 文档 | 内容 |
|---|------|------|
| 01 | [产品与系统架构](docs/architecture/01-product-architecture.md) | 定位 · 三层模型 · 技术选型 · 目录结构 · 生命周期状态机 · 谱系 · 归档 · 部署 · 文档模型 · ADR |
| 02 | [数据库设计与 ER 图](docs/architecture/02-database-er.md) | ER 图 · 21 张表完整 schema · 索引策略 · 完整性约束 · 迁移 · Seed · 备份 |
| 03 | [权限模型](docs/architecture/03-permission-model.md) | 权限矩阵 · Scope 计算 · 资源级规则 · Authorization Service · 20 条安全用例 |
| 04 | [信息架构与 UI Layout](docs/architecture/04-ui-information-architecture.md) | 页面树 · 侧边栏 · 设计 Token · 关键页面结构 · 组件清单 · 响应式 |
| 05 | [API 设计](docs/architecture/05-api-design.md) | 响应约定 · 60+ 端点 · 请求/响应示例 · 错误码 · 限流 |
| 06 | [FastGPT 集成方案](docs/architecture/06-fastgpt-integration.md) | **已核实 API 规格** · ADR-08 安全决策 · Provider 抽象 · Context 构建 · 幻觉过滤 |
| 07 | [MVP 与开发计划](docs/architecture/07-mvp-and-development-plan.md) | P0–P3 · Phase 0–9 · 排期 · DoD · 明确不做清单 |
| 08 | [风险与安全清单](docs/architecture/08-risk-and-security.md) | 15 项风险 · 安全清单 · 备份恢复 · 上线检查表 |

---

## 核心设计要点（速览）

### 生命周期

```
需求 → DRAFT → PLANNED → IN_PROGRESS → WAITING_ACCEPTANCE
     → COMPLETED（开发完成）→ ARCHIVED（沉淀为资产）
异常：ON_HOLD · CANCELLED · MERGED
```

**COMPLETED ≠ ARCHIVED**
- `COMPLETED` = 开发做完了
- `ARCHIVED` = 已正式成为公司软件资产

### 派生状态（不存库，后端统一计算）

| 派生态 | 规则 |
|---|---|
| 延期 OVERDUE | `today > dueDate` 且未完成 |
| 即将到期 DUE_SOON | `dueDate - today ≤ 7 天` |
| 长期未更新 STALE | 进行中且 > 7 天无 ProjectUpdate |

### 权限（唯一铁律）

```
Server-side Authorization · 单一 authz.ts 入口
Scope 注入查询条件（先过滤后查询）
越权统一 404（非 403，不泄露存在性）
USER 默认不可见 Deployment / 维护说明 / 内部文档 / 历史
AI 与项目访问共用同一 Authorization Service
```

> 前端隐藏按钮只是体验优化，**永远不是安全边界**。

### 归档完整度

9 项加权：需求 15 / 验收 10 / 部署 15 / 版本 10 / 文档 15 / 截图 10 / 注意事项 10 / 维护 10 / 确认 5

允许不完整归档（如 57%），显示 `⚠️ 档案未完成`。

### 项目谱系

```
rootProjectId（冗余，避免递归） + parentProjectId + project_relations
支持 PARENT_CHILD / BRANCH / RELATED（预留 MERGED / MIGRATED）
从历史项目建分支：继承背景，重填关键字段，不做一键克隆
```

---

## 关键架构决策（ADR 摘要）

| # | 决策 | 理由 |
|---|------|------|
| ADR-01 | 模块化单体 | 2 人团队，微服务成本远超收益 |
| ADR-02 | Tailwind 3.4（非 v4） | Aceternity + shadcn 生态稳定优先 |
| ADR-03 | 自研 JWT（非 NextAuth） | 逻辑全掌控，无黑盒 |
| ADR-04 | 仅 DB 容器化，应用本地跑 | 符合开发期要求，不污染本机 |
| ADR-05 | Markdown（非富文本编辑器） | 克制、无 XSS 面、易检索 |
| ADR-06 | 不引入图表库 | 自绘 SVG 足够，减少依赖 |
| ADR-07 | 派生状态后端统一计算 | 防止前端规则漂移 |
| **ADR-08** | **AI 用 Context Injection，不做知识库同步** | **权限 100% 自控，数据不驻留共享 FastGPT 实例** |
| ADR-09 | 端口 3010 | 3000 / 7000-7010 已被占用 |

---

## ⚠️ 需要确认的两个决策点

### 1. AI 集成方式（ADR-08）

**发现**：FastGPT 的 API Key 是**「成员凭证」**而非应用级密钥（官方文档明示）。公司的 FastGPT 是共享实例。若把项目数据同步进 FastGPT 知识库，权限就不再由本系统掌控。

| 方案 | 权限控制 | 数据驻留 | 实时性 | 运维 |
|---|---|---|---|---|
| **A. Context Injection（推荐）** | 100% 由 IPM 控制 | FastGPT 侧零持久 | 实时 | 无同步任务 |
| B. 知识库同步（需求原文 111 条） | FastGPT 侧检索，风险高 | 长期驻留共享实例 | 有滞后 | 需同步/重试/增量 |

推荐 **A**。若坚持 B，前置条件见 [06 文档 §8](docs/architecture/06-fastgpt-integration.md)。

### 2. 数据库运行方式

| 选项 | 说明 |
|---|---|
| **A. Docker 容器（推荐）** | `postgres:16-alpine`，5432，数据卷持久化，不污染本机 |
| B. 本机安装 PostgreSQL 16 | 需下载安装，占用系统服务 |

推荐 **A**。

---

## 开发计划

| Phase | 内容 | 工作量 |
|---|---|---|
| 0 | 地基（Next.js + Prisma + PG + health） | 0.5d |
| 1 | 认证 + 权限内核 | 1d |
| 2 | 项目 CRUD + 列表 | 1.5d |
| 3 | 详情 + 更新流 | 1.5d |
| 4 | Dashboard + 搜索 | 1d |
| 5 | 归档 + 软件资产 | 1.5d |
| 6 | 文档 / 部署 / 版本 | 1.5d |
| 7 | 谱系 / 迁移 / 合并 / 分享 | 1.5d |
| 8 | AI 集成（FastGPT） | 1.5d |
| 9 | 加固与交付（测试 / Docker / README / 备份） | 1d |
| | **合计** | **≈ 12.5 人日** |

**Phase 1–4（P0）≈ 4 人日** → 最小可用版本。

> 每完成一个 Phase：运行 → 测试 → 修复 → 确认，再进入下一阶段。

---

## 成功标准

一个完全不了解历史的新员工，搜索「采购管理系统」，**30 分钟内**能回答：

它是什么 · 为什么做 · 谁提出 · 谁开发 · 何时完成 · 验收了吗 · 是否还运行 · 运行在哪 · 服务器与端口 · 什么版本 · 怎么部署 · 有什么坑 · 怎么维护 · 文档在哪 · 出过什么问题 · 后来有没有继续开发

并且可以直接问 AI：**「这个系统出问题应该先看什么？」**

> 答案必须基于真实项目资料，**不是 AI 猜测**。
