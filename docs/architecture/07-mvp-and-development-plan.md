# 07 · MVP 范围与开发计划

> 铁律：**每完成一个 Phase，必须 运行 → 测试 → 修复 → 确认，再进入下一阶段。**
> 不一次性生成几万行代码。

---

## 1. 优先级分层

| 优先级 | 范围 | 价值 |
|---|---|---|
| **P0** | 认证 · 权限 · 项目 · 部门 · 项目类型 · Updates · Dashboard · 搜索 | 系统能用，项目能管 |
| **P1** | Archive · 文档 · 截图 · Deployment · 版本 · Timeline · History · Branch · Migration · Merge | 历史能留，资产能沉淀 |
| **P2** | Share · AI Gateway · FastGPT · AI Context · AI Source | 知识能问 |
| **P3** | AI 归档助手 · 自动知识同步 · 高级搜索 · 通知 · 外部集成 | 未来扩展 |

---

## 2. 开发阶段（Phase）

### Phase 0 · 地基 〔预计 0.5 天〕

| 任务 | 产出 |
|---|---|
| 初始化 Next.js 15 + TS strict + Tailwind 3.4 | 可运行空壳 |
| ESLint + Prettier + 目录骨架 | 规范就绪 |
| Prisma + PostgreSQL 16 容器（5432） | DB 连通 |
| `.env.example` / `.gitignore` / `.editorconfig` | 无密钥入库 |
| `/api/health` | `{ app, database }` |

**验收**：`npm run dev` 在 **3010** 启动；`/api/health` 返回 database ok。

---

### Phase 1 · 认证与权限内核 〔1 天〕

| 任务 | 产出 |
|---|---|
| Prisma schema 全量表 + 首次 migration | `prisma/migrations/` |
| seed：admin / master / demo_user / 6 部门 / 7 项目类型 | `prisma/seed.ts` |
| bcryptjs + JWT(jose) + httpOnly cookie | 登录/登出/me |
| **`authz.ts` 单一权限入口** | Scope + assert 系列 |
| `projectRepo` 封装 + ESLint 禁用裸 prisma.project | 数据层隔离 |
| 审计日志写入器 | `audit()` helper |
| 登录页 + middleware 守卫 | `/login` |

**验收**：
- admin / master / demo_user 可登录
- S-01/S-02/S-07/S-14/S-15 安全用例通过
- 密码为 hash；`.env` 未被提交

---

### Phase 2 · 项目 CRUD + 列表 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| 项目编号生成器（序列 + 行锁） | `PRJ-2026-0001` |
| 项目 CRUD API + 分页/过滤/排序 | §05 端点 |
| 状态机 `ProjectStateMachine` | 合法迁移白名单 |
| 派生状态计算（延期/即将到期/未更新） | `derivation.ts` |
| 项目列表页（Table）+ FilterBar + 分页 | `/projects` |
| 创建/编辑表单（第一屏精简） | `/projects/new` |
| Inline Edit（状态/健康/负责人/优先级/进度/到期日） | 表格内编辑 |
| 部门管理 + 项目类型管理（ADMIN） | `/settings/*` |

**验收**：创建项目编号正确；改到期日自动显示延期；S-08/S-09/S-16 通过。

---

### Phase 3 · 项目详情 + 更新流 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| 项目详情页 + 7 个 Tab 骨架 | `/projects/[id]` |
| Overview（目标/需求/验收 Checklist） | Markdown 渲染 + sanitize |
| Updates 更新流 + 新增更新表单 | 独立表，永久保留 |
| 关键字段变更记录（before/after/人/时间/原因） | History Tab |
| Timeline 事件写入 | `project_timeline_events` |
| 用户管理（ADMIN） | `/settings/users` |

**验收**：更新不可被覆盖；改 dueDate 后 History 显示前后值；S-19 通过。

---

### Phase 4 · Dashboard + 搜索 〔1 天〕

| 任务 | 产出 |
|---|---|
| ADMIN/MASTER Dashboard（6 指标卡 + Attention + 分布） | `/dashboard` |
| USER Dashboard（本部门视角） | `/dashboard` |
| 全局搜索（权限过滤） | `/api/search` |
| My Department 页面 | `/my-department` |
| 快捷键 N / `/` / Esc | — |

**验收**：打开首页 3 秒内看到「哪些项目有问题」；USER 搜不到他部门外项目。

---

### Phase 5 · 归档与软件资产 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| 归档档案实体 + 完整度计算（9 项加权） | `archiveCompleteness` |
| 归档 Checklist（自动判定 + 人工勾选） | `/archive/[id]` |
| Software Asset Card | 资产卡组件 |
| 项目验收 → COMPLETED → 归档流程 | 状态机扩展 |
| Archive 列表 + 筛选/排序 + 不完整徽章 | `/archive` |
| 取消归档 / 补充资料 | — |
| 交接信息（handoverInfo）字段与 UI | ★ |

**验收**：完整度随资料补全实时变化；61% 时显示「⚠️ 档案未完成」。

---

### Phase 6 · 文档 / 截图 / 部署 / 版本 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| StorageDriver 抽象 + LocalDriver | 随机 storageKey |
| 文档上传（类型/版本/当前版本切换） | 事务内切换 |
| 截图上传 + 预览 | — |
| 文档下载（鉴权后流式） | 不暴露真实路径 |
| Deployment CRUD（多环境） | 独立实体 |
| 凭证黑名单拦截 + 审计 | 安全红线 |
| 版本管理 | `project_versions` |
| 特殊注意事项 / 维护说明字段 | — |

**验收**：S-03/S-04/S-05/S-06 通过；上传含密码文本被拒。

---

### Phase 7 · 谱系 / 迁移 / 合并 / 分享 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| 父子/分支关系 + Lineage Tree | `/projects/[id]` Lineage Tab |
| 从历史项目创建分支（继承背景，重填关键字段） | `POST /branch` |
| 部门迁移（事务 + 记录 + 权限即时生效） | `POST /migrate` |
| 项目合并（batch + 双项目 MERGED + 关系） | `POST /merge` |
| 分享 Token（生成/复制/撤销/重新生成） | `/share/[token]` |
| 分享页（白名单字段，剥离内部信息） | — |
| 回收站（ADMIN/MASTER） | `/settings/recycle-bin` |

**验收**：S-13/S-17 通过；合并后 A/B 不可编辑但可查；分享页无 IP/端口。

---

### Phase 8 · AI 集成 〔1.5 天〕

| 任务 | 产出 |
|---|---|
| AIProvider 接口 + FastGPTProvider | 已核实 API 规格 |
| 意图识别 + Scope 内检索 | RAG-lite |
| Context 组装（[SRC-n] 标记） | — |
| 系统提示词（防编造硬约束） | — |
| 来源解析 + **幻觉引用过滤** | ★ |
| 对话持久化（conversations/messages） | — |
| AI 页面 + 项目上下文带入 | `/ai` |
| AI 总结（项目页） | `POST /api/ai/summarize` |
| Settings AI 配置 + 测试连接 + 熔断降级 | `/settings/ai` |

**验收**：A-01 ~ A-12 全部通过；FastGPT 停机时主功能正常。

---

### Phase 9 · 加固与交付 〔1 天〕

| 任务 | 产出 |
|---|---|
| Playwright 权限 E2E（S-01 ~ S-20） | `e2e/security.spec.ts` |
| Vitest 服务层单测（状态机/完整度/编号/权限） | `*.test.ts` |
| `Dockerfile` + `docker-compose.yml`（Docker-ready） | 应用 + DB |
| `backup.sh` / `restore.sh` | 含 storage 目录 |
| `README.md`（完整：架构/运行/迁移/Seed/环境变量/账号/FastGPT/Docker/备份恢复） | — |
| `LICENSE` / 最终 `.gitignore` 审查 / 密钥扫描 | GitHub-ready |
| 端到端走查（需求 154 条验收场景） | 验收报告 |

**验收**：154 条场景逐条走通；仓库无敏感信息。

---

## 3. 排期总览

| Phase | 内容 | 工作量 |
|---|---|---|
| 0 | 地基 | 0.5d |
| 1 | 认证 + 权限内核 | 1d |
| 2 | 项目 CRUD + 列表 | 1.5d |
| 3 | 详情 + 更新流 | 1.5d |
| 4 | Dashboard + 搜索 | 1d |
| 5 | 归档 + 资产 | 1.5d |
| 6 | 文档/部署/版本 | 1.5d |
| 7 | 谱系/迁移/合并/分享 | 1.5d |
| 8 | AI 集成 | 1.5d |
| 9 | 加固与交付 | 1d |
| | **合计** | **≈ 12.5 人日** |

> Phase 1–4（P0）为**最小可用版本**，约 4 人日可交付试用。
> Phase 1–7（P0+P1）为**可替代人工整理历史项目**的版本，约 8.5 人日。

---

## 4. 每个 Phase 的完成定义（DoD）

- [ ] 代码可运行，无 TypeScript 错误（`tsc --noEmit` 通过）
- [ ] ESLint 无 error
- [ ] 该 Phase 的全部安全用例通过
- [ ] 关键流程手工走查通过
- [ ] 数据库变更已生成 migration
- [ ] 该 Phase 涉及的审计埋点已生效
- [ ] 向用户演示并确认后，才进入下一 Phase

---

## 5. 明确不做（第一版）

Sprint · Story Point · Epic · Velocity · 工时报工 · 审批流 · 预算/财务 · CRM · 复杂消息中心 · 复杂 BI · Kanban 引擎 · Gantt · 通知中心 · 自动知识同步 · 邮件/IM 集成 · 多语言 · 多租户

> 遇到新想法时判定标准：**是否直接提高「项目管理效率 / 历史资产价值 / 知识继承能力 / AI 查询能力」？** 否 → 暂不实现。
