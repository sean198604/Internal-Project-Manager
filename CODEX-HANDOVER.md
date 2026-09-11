# Internal-Project-Manager（项目管理中心）· Codex 交接文档

> 更新时间：2026-09-10 17:27（Asia/Shanghai）｜ 上版 2026-09-08 14:40（已并入本文，git 历史 3e2d751 可回溯）
> 交接目的：完整进度 + 系统要点 + **未完成待办**，供 Codex 无缝接手。
> 项目路径：`C:\Users\Administrator\Documents\Github\Internal-Project-Manager`
> GitHub：`sean198604/Internal-Project-Manager`（**PRIVATE**，远端已建并 push）

---

## 1. 项目定位（一句话）

**公司内部软件项目管理中心**：管理「内部软件项目生命周期 + 沉淀为软件资产 + 知识继承」，**不是** Todo App / Jira Clone / PLM。
三层模型：Active Projects（在做什么）→ Project Archive（做完沉淀为资产）→ Knowledge + AI（历史可查可继承，AI 属 P2，未启动）。

产品主色 #1a365d，UI 全面模仿公司既有系统 8765（HR-System v3.0）与 7006/7007 Liquid Glass 风格，两系统看着像一套。界面文案为「项目管理中心」（非「内部软件项目管理中心」）。

---

## 2. 当前运行状态（实测快照 2026-09-10）

| 项目 | 状态 |
|---|---|
| 应用服务 | ✅ Docker 容器 `ipm-app`，生产模式监听 `0.0.0.0:3010`（http://localhost:3010 或 http://192.168.1.246:3010），健康检查通过 |
| 数据库 | ✅ Docker 容器 `ipm-postgres`（postgres:16-alpine），host 端口 5432，库 `ipm`，健康查询通过 |
| 自动启动 | ✅ `ipm-app` 与 `ipm-postgres` 均为 `restart: unless-stopped`；Docker Desktop `AutoStart=True` |
| 管理员账号 | `admin`（密码由管理员维护，不写入仓库；唯一账号；admin id `5af39e51-f110-423d-b6ea-83691229c423`） |
| 类型检查 | `npx tsc --noEmit` 应为 0 错误（每次改完必跑） |
| git | ✅ 已建仓，远端 private 的 `main` 已同步；Codex 接手基线提交 `3072b8b` |
| 工作区落地 | ✅ 侧栏、分享选择、时间轴产物与最新版交接文档已提交并推送；文档中的明文登录凭据已脱敏 |

### 环境铁律（实测结论，勿再改）
- 应用端口 **3010**（3000 与 7000-7010 被 Docker Desktop 代理占用，不可用）
- PostgreSQL **5432**，连接串仅见本地 `.env`（gitignored，禁止写入文档或镜像）
- 生产应用由 `compose.yaml` 管理；容器内通过 `host.docker.internal` 连接宿主机 PostgreSQL，上传目录 `storage/` 挂载持久化
- 当前通过局域网 HTTP 访问，Compose 必须设置 `COOKIE_SECURE=false`；未来切换 HTTPS 后改为 `true`，否则浏览器会丢弃登录 Cookie
- 时区铁律：**数据库存 UTC，展示一律 Asia/Taipei**（`.env` `APP_TIMEZONE=Asia/Taipei`；前端用 `src/lib/time.ts`，禁止 getUTC* 直显）
- FastGPT 已独立部署 `192.168.1.246:3000`，**不入库、不 iframe、不重新部署**；AI 相关（P2）表一律未创建
- `wsl.exe` 被安全策略拦截，不可调用
- `.env.example` 仍带 FastGPT 占位 URL；真实密钥只存本地 `.env`（gitignored）

### 常用命令
```bash
docker compose up -d --build app   # 构建并启动生产应用
docker compose ps                 # 查看容器与健康状态
docker logs --tail 100 ipm-app    # 查看应用日志
docker compose restart app        # 重启应用
npm run dev                       # 仅本地开发；须先 docker compose stop app 释放 3010
npx tsc --noEmit       # 类型检查（必须 0 错误）
npm run db:migrate     # prisma migrate dev（改 schema 后）
npm run db:seed        # node --env-file=.env --import tsx prisma/seed.ts
docker exec ipm-postgres psql -U ipm -d ipm -c "<SQL>"          # 直查 DB
cat x.sql | docker exec -i ipm-postgres psql -U ipm -d ipm      # 批量 SQL 唯一可靠通道（见 §11）
```

> ⚠️ **改 schema 前先执行 `docker compose stop app`**；若同时运行本地 dev server，也必须停止（query_engine DLL 被占 → prisma generate 报 EPERM）。重启本地 dev 前必须清 `.next`：`python -c "import shutil;shutil.rmtree(r'...\.next',ignore_errors=True)"`。完成迁移后用 `docker compose up -d --build app` 重建生产应用。

---

## 3. 进度总览（已完成 vs 未完成）

### ✅ 已完成（截至 2026-09-09）
- **P0 全栈**（09-06 落地）：19 张表迁移 + 干净 seed；50+ API；11 工作区页；权限模型（USER 部门隔离 + 越权 404）；状态机/派生状态/谱系/分享 Share Bundle/归档 9 项 checklist；E2E 26 步验证
- **真实资产入库**：22 项 Docker 项目已归档（完整度 21×100 + 0020×90），specialNotes/maintenanceNotes/handoverInfo 等字段经 6 批端口升序批量精修
- **09-07~08 迭代**：归档时间=docker StartedAt 回填；21 项补 DOCUMENT+SCREENSHOT；UI 全面模仿 8765；端口排序；SEAN logo
- **09-08~09 六项任务（全部完成并验证）**：
  1. 验收标准字段（acceptanceCriteria）支持
  2. 分享选项目 pageSize 100 修复（原 200 超后端上限静默失败）
  3. 部门**两级分类**（BUSINESS/FUNCTION，7 职能部=FUNCTION）
  4. **修改密码** API + 侧栏按钮（PASSWORD_CHANGE 审计）
  5. 收起侧栏图标 `<>` → `»`
  6. **项目星级** 1-5（admin 打分，RATING_CHANGED 事件，不受终态限制）
- **状态机体验修复**：点「已完成」无效 → 新增 `status-flow.ts`（BFS 找路径逐跳 PATCH）+ 详情页绿色「✓ 标记已完成」直达按钮；编辑器加宽 1152px + 生命周期/状态/进度/优先级高亮载体
- **09-09 前端 3 项**：侧栏 sticky 固定视口（用户区常驻底部不再被长内容顶走）；分享弹窗加「全选已归档」（后修 bug 为替换语义）
- **进度更新回填机制（新能力，用户重点要求）**：从各项目 `.workbuddy/memory/*.md` 提炼迭代节点；无记忆目录时以 Git、Docker 元数据和项目文档交叉验证。双写 `ProjectUpdate`（进度/内容/卡点/下一步）+ `ProjectTimelineEvent(UPDATE_ADDED)`。已回填 **8 个项目共 66 条**（见 §4）
- **09-10 生产容器化**：新增 `ipm-app` Docker 服务、健康检查、上传目录持久化和自动重启；数据库容器同步设置 `unless-stopped`，3010 局域网访问实测恢复

### ⏳ 未完成（Codex 接手待办，详见 §8）
1. **进度更新回填剩余 15 个项目**（每批 2 个，用户原话「不求快，2个2个来，真实准确完整」）
2. PRJ-2026-0006 名称笔误修正（见 §8-C）
3. 杂项：TESTTYPE 测试类型可删；PRJ-2026-0024 档案细节核对

### 尚未启动（P1 / P2）
- P1：全局搜索 / 历史批量整理 / 资产搜索 / 导出 / 基础备份 / Health Check 深化 / Audit Log 报表
- P2：AI Assistant / FastGPT / RAG（AI 表不创建，直到 P2 启动；AI 与项目共用同一 Authorization Service）

---

## 4. 数据库现状（2026-09-09 17:30 直查快照）

### 项目（23 行 alive = 22 ARCHIVED + 1 COMPLETED；另有 1 软删占号 0004）
- `PRJ-2026-0024 报价单自动化-ADA`：已由 DRAFT 补全为 **COMPLETED / 100%**，归属 FESTIVAL
- 22 项归档完整度：21 项 100/100，0020 aiproxy 90/100（无 Web UI，特殊注意事项已说明）
- 星级已打样例：0003 汇率 = 5 星

### 进度更新回填覆盖（ProjectUpdate 计数，8/23）
| 项目 | 条数 | 时间跨度 |
|---|---|---|
| 0017 FastGPT(3000) | 7 | 05-13 → 07-09 |
| 0021 NewsNow(4444) | 6 | 05-22 → 07-30 |
| 0001 装箱计算器(7002) | 14 | 04-22 → 09-02 |
| 0010 文化积分(7006) | 11 | 04-20 → 09-07 |
| 0023 HR 简历工具(8765) | 11 | 09-04 → 09-07 |
| 0011 众瀚四季(7007) | 10 | 05-18 → 09-07 |
| 0002 Doc-Slim(7001) | 6 | 05-14 → 08-28 |
| 0024 报价单 ADA | 1 | 建档 |

**未回填 15 个**（端口升序）：5050 汇率(0003) / 5051 email-web(0015) / 7000 提示词库(0005) / 7003 利润(0009) / 7004 客户调研(0008) / 7005 产品调研(0007) / 7008 doc-center(0012) / 7009 文化日历(0013) / 7010 Dify(0018) / 7020 n8n(0019) / 7021 batch(0016) / 8000 名片识别(0014) / 8886 DockSight(0022) / 8888 门户(0006) / aiproxy(0020)

### 部门（16 行 = 15 在用 + 1 停用测试 TEST）
BUSINESS 业务类：FESTIVAL 节日 / OUTDOOR 户外 / ECOMMERCE 电商 / SEA_SUPPLY 东南亚供应链 / JP_GOODS 日用百货 / KITCHEN 餐厨 / MOBILE_LIGHT 移动光源 / JAPAN 日本 / SHANGHAI 上海
FUNCTION 职能类：HR 人力 / ADMIN_OFFICE 行政 / BIZ_MGMT 业务管理 / FINANCE 财务 / DOCS 单证 / GM_OFFICE 总经理室
（TEST 测试部 isActive=false）

### 用户（1 行）/ 类型（8 行）
`admin / ADMIN / 系统管理员`。项目类型 7 默认 + TESTTYPE 测试残留（可删）。

---

## 5. 目录地图（关键文件 + 职责，★=09-08/09 新增）

```
Dockerfile / compose.yaml          # ★ 生产应用镜像与 ipm-app 服务（3010、健康检查、自动重启）
docker-entrypoint.sh               # ★ 容器入口；将本地 DATABASE_URL 主机名转换为 Docker Desktop 网关
.dockerignore / .gitattributes     # ★ 排除密钥/运行数据并固定入口脚本 LF 换行
app/(workspace)/layout.tsx          # 工作区壳：Sidebar + Topbar + main
app/(workspace)/{dashboard,projects,archive,settings,shares}/
app/share/[token]/page.tsx          # 公开分享页（免登录）
app/login/                          # 登录页（8765 风格）
app/api/…                           # 35+ route.ts
app/api/auth/password/route.ts      # ★ 修改密码 POST（校验旧密+强度，PASSWORD_CHANGE 审计）
app/api/projects/[id]/rating/route.ts  # ★ 星级 PUT（仅 ADMIN/MASTER）
prisma/schema.prisma                # 19 表；Project.rating ★；DepartmentCategory 枚举 ★；RATING_CHANGED/PASSWORD_CHANGE 事件 ★
prisma/migrations/…/add_project_rating/  # ★ rating + DepartmentCategory + 2 事件类型
src/server/lib/auth.ts              # getActorOrNull（httpOnly cookie JWT）
src/server/lib/authz.ts             # Actor / buildScope / isAdminOrMaster（权限唯一入口）
src/server/lib/{api,errors,audit,rate-limit,markdown}.ts
src/server/modules/projects/
  numbering.ts      # PRJ-YYYY-NNNN 序列表 + 行锁（禁 MAX+1）
  state-machine.ts  # ALLOWED_TRANSITIONS 相邻迁移表（唯一真源）
  status-flow.ts    # ★ 状态机 BFS：findPath + advanceStatus 自动逐跳 PATCH
  derivation.ts     # 派生状态（OVERDUE/DUE_SOON/STALE）后端统一计算
  schema.ts         # zod（sort enum 含 port；★ rating/acceptance 校验）
  repository.ts / serializer.ts / service.ts  # ★ rating 支持 + rateProject()
  archive.ts        # 归档完整性 9 项权重
  subresources.ts   # updates/deployments/documents/…（★ 部门 category 读写）
src/server/modules/settings/service.ts  # 部门/用户/类型 CRUD
src/features/…
  project-editor.tsx        # ★ 重排版：生命周期高亮 + 3 列载体 + save() diff-only
  project-detail-view.tsx   # ★ 头部绿色「标记已完成」+ 标题下星级
  projects-list-view.tsx    # ★ 星列 + 部门 optgroup
  share-manager.tsx         # ★ 分享选择：全选进行中/全选已归档(替换语义)/清空
src/components/layout/sidebar.tsx        # ★ sticky 固定 + 用户区常驻 + » 收起 + 改密入口
src/components/layout/change-password-dialog.tsx  # ★ 改密弹窗
src/components/star-rating.tsx           # ★ 5 星交互（再点当前星=取消）
src/components/form-helpers.ts           # apiFetch（自动解包 {data}）★所有客户端请求必须走它
src/lib/time.ts          # formatDateTime（Asia/Taipei）
storage/documents/       # 上传文件落盘（gitignored）
```

---

## 6. 功能清单（页面 + API 要点）

### 页面
- `/projects` 列表：状态筛选 9 项、排序含端口/更新时间/星级；行内快捷操作
- `/projects/[id]` 详情 8 Tab（总览/更新流/文档/部署/版本/历史/谱系/合并迁移）；顶部绿「标记已完成」（自动 BFS 逐跳）；星级交互
- `/archive` 资产：完整度/端口/归档时间/三子表；部门按两级分类分组
- `/settings/{users,departments,project-types}` ADMIN CRUD（部门带 BUSINESS/FUNCTION 大类）
- `/shares`：**新建分享弹窗内「全选进行中 / 全选已归档 / 清空」三个按钮**（全选类均为替换式）
- 其余：/dashboard /projects/new /share/[token] /login

### API 补充（35 路由之外新增）
- `POST /api/auth/password`（改密：校验旧密码；错误码 CURRENT_PASSWORD_WRONG / NEW_PASSWORD_SAME）
- `PUT /api/projects/[id]/rating`（星级，仅 ADMIN/MASTER，**不受终态限制**，ARCHIVED 也能改）
- `GET/POST /api/projects/[id]/updates` · `GET /api/projects/[id]/timeline`（进度更新/历史时间线载体）

### 两段式上传协议（不变）
1. `POST /projects/[id]/documents` `{mode:"start",fileName,size,mimeType}` → `{data:{attachmentId,storageKey}}`
2. `PUT /api/uploads/<encodeURIComponent(storageKey)>` 传二进制
3. `POST /projects/[id]/documents` `{attachmentId,docType,title,version,isCurrent}` → 自动 `syncArchiveState`
- `docType` 枚举：`REQUIREMENT/DOCUMENT/SCREENSHOT/DEPLOYMENT/TESTING/ACCEPTANCE/OTHER`（无 DESIGN/OPERATIONS）

---

## 7. 铁律与易错点（Codex 必读，按重要性排序）

1. **权限 = 服务端唯一权威**：一切查询先 `buildScope(actor)` 注入过滤（先过滤后查询）；越权统一 **404**；USER 不可见 Deployment/维护/内部文档/History；前端隐藏按钮不是安全边界。AI 接入必须复用同一 Authorization Service。
2. **状态机相邻迁移 + 双入口**：`state-machine.ts` ALLOWED_TRANSITIONS 为唯一真源；前端详情页的「标记已完成」走 `status-flow.ts` BFS 自动逐跳 PATCH（DRAFT→…→COMPLETED），**不可跨跳直写**。`COMPLETED ≠ ARCHIVED`；`MERGED` 终态不可物理删除；历史项目软删进回收站。
3. **星级铁律**：`rating`（1-5，0=未评）仅 ADMIN/MASTER 可写，**不受终态限制**（归档后仍可打分/改分）；打分会记 `TimelineEventType.RATING_CHANGED`。
4. **分享「全选已归档/进行中」= 替换语义**：`setSelected(new Set(筛选结果))`，**禁止** `new Set(prev)+add` 累积式——曾导致先选进行中再点已归档时"已完成未归档"记录残留选中。
5. **派生状态（延期/即将到期/长期未更新）不存库**：后端 `derivation.ts` 统一计算。
6. **API 信封约定**：后端 `ok()/created()` 一律 `{data:...}`；客户端必须走 `apiFetch`（自动解包），新页面禁止手动 `res.data` / 读顶层字段。
7. **时区铁律（含验证坑）**：DB 存 UTC，展示 Asia/Taipei（前端 `formatDateTime`）。**Prisma DateTime 映射 PG `timestamp(3)` 无时区列**（ProjectUpdate/ProjectTimelineEvent 等 createdAt 均是）；批量 SQL 验证时间用 `to_char("createdAt" + INTERVAL '8 hours',...)`，**禁用 `AT TIME ZONE 'Asia/Shanghai'`**（会把已存 UTC 墙钟当上海钟再换算，显示偏 8h——曾误判数据错）。
8. **归档完整性 9 项加权**（REQUIREMENT 15/DEPLOYMENT 15/DOCUMENT 15/VERSION 10/ACCEPTANCE 10/SCREENSHOT 10/SPECIAL_NOTES 10/MAINTENANCE 10/CONFIRMED 5）；允许不完整归档（⚠️ 档案未完成）。
9. **归档时间 = docker 最后启动时间**（`docker inspect -f '{{.State.StartedAt}}'` UTC）；批量录入禁止 `archivedAt: new Date()`（曾致 22 项同刻）。
10. **端口不是 Project 字段**，是 `ProjectDeployment.port`；列表/归档端口列 = 最新一条部署的 port（take:1, orderBy lastVerifiedAt desc）；表无 `deployedAt`（是 `lastVerifiedAt`/`createdAt`），先查 schema 再写。
11. **Prisma 不支持 relation 字段 SQL 排序**（`orderBy:{deployments:{port:asc}}` 报错）：内存二次排序 + `ListRowForSerializer` 结构化子集。
12. **archive() 事务顺序**：先 `tx.project.update()` 写归档字段，**再** `syncArchiveState()`（反了 checklist/分数滞后）。
13. **进度回填双写协议**：`ProjectUpdate(content/progress/currentIssues/nextSteps/createdAt)` + `ProjectTimelineEvent(UPDATE_ADDED)`（occurredAt=createdAt 防重用 NOT EXISTS）。progress 是历史回溯（从低到高逼近当前值），**不修改 `Project.progress`**（那是当前态）。
14. **改 schema 流程**：停 dev → 改 schema.prisma → `npm run db:migrate` → `npx prisma generate` → 重启 dev（先 Python 清 .next）。DepartmentCategory 默认 BUSINESS，7 职能部（HR/ADMIN_OFFICE/BIZ_MGMT/FINANCE/DOCS/GM_OFFICE/TEST）= FUNCTION。
15. `middleware.ts` PUBLIC_PREFIXES 含 `/api/public`（公开分享免登录，漏加 401）。
16. touchesCritical 字段（进度/状态/实际完成日期/验收日期/部门/负责人/优先级/预计完成日期）：仅 ADMIN/MASTER 可改，USER 改任一 → 404。
17. 项目编号 `PRJ-YYYY-NNNN` 走序列表 + 行锁（numbering.ts），禁止 MAX()+1。
18. Next 15 favicon：只留 `app/icon.jpg` 文件系统约定，勿加 metadata.icons（会冲突）。
19. **禁止存储任何密钥**：API Key/Token/Secret/密码一律不落库不写文档（codex-card 等项目记忆里的真实 Key 曾按此铁律脱敏处理）。
20. UI 无图表库（自绘 SVG）、无富文本（Markdown 渲染器）；Glass 风格下拉弹窗**白底**不用玻璃效果。

---

## 8. Codex 接手待办（PENDING，按优先级）

### Task A：git 工作区落地（✅ 已完成）
- `CODEX-HANDOVER.md`、侧栏固定、分享全选已归档与 HR 时间轴演示产物已提交并推送到 `origin/main`
- 接手基线提交：`3072b8b feat: refine sidebar and share selection`
- 交接文档中的明文登录凭据已脱敏；旧初始提交仍可回溯到历史文本，实际登录凭据应由管理员另行轮换
- 后续继续**按功能小步提交**（diff-only，别一次全堆）

### Task B：进度更新回填剩余 15 个项目（主任务，用户持续关注）
- 用户原话：「把其他项目逐个的进度更新完整补充进去，不求快，**2个2个来**，真实准确完整，把项目写清楚」「继续进度更新回填」
- 方法（已验证 4 批）：读各项目 `.workbuddy/memory/*.md`（按日期排序）+ `MEMORY.md` → 提炼 5-15 个关键迭代节点 → 双写 ProjectUpdate + ProjectTimelineEvent → 刷新 lastUpdateAt → DB 验证（`createdAt + interval '8 hours'` 显示）
- 写 SQL 用项目根临时文件 `.tmp_*.sql` → `cat .tmp_*.sql | docker exec -i ipm-postgres psql -U ipm -d ipm` → 用完删除
- 数据源目录：`C:/Users/Administrator/Documents/Github/<项目名>/.workbuddy/memory/`（batch-product-studio 在 `D:/batch-product-studio`）
- 已完成首批：**3000 FastGPT(0017) 7 条 + 4444 NewsNow(0021) 6 条**，共 13 条；双写、时区、事件配对和进度单调性均已验证
- 顺序（端口升序，每批 2 个）：下一批 **5050(0003)+5051(0015)** → 7000(0005)+7003(0009) → 7004(0008)+7005(0007) → 7008(0012)+7009(0013) → 7010(0018)+7020(0019) → 7021(0016)+8000(0014) → 8886(0022)+8888(0006) → aiproxy(0020)
- ⚠️ 记忆文件若含真实 API Key（如 codex-card、batch），**只写配置姿势，不写 Key**

### Task C：数据修正与杂项
1. **PRJ-2026-0006 名称笔误**：现名「主服务器888：内部效率平台」，实际端口 **8888** → 改名「主服务器8888：内部效率平台」（同 0014 曾「5000→8000」修正案例；改前与用户确认）
2. PRJ-2026-0024 报价单 ADA：已 COMPLETED/100%，核对验收标准/里程碑是否需补（当前仅 1 条 update）
3. 可删测试类型 `TESTTYPE`（settings API DELETE）；TEST 测试部已停用可留可删
4. 项目根无 README（docs/ 是架构文档）；如需可从本文档裁剪

### Task D：P1 / P2（用户尚未启动，勿自作主张开发）
- P1：全局搜索 / 历史批量整理 / 资产搜索 / 导出 / 基础备份 / Health Check 深化 / Audit Log 报表
- P2：AI Assistant / FastGPT / RAG（表不创建；AI 鉴权复用 authz）

---

## 9. UI 规范速查（全面模仿 8765 / HR-System v3.0 + Liquid Glass）

- 设计令牌：`--primary #1a365d`、`--primary-light #dbeafe`、`--info #378ADD`、`--accent #f59e0b`、`--success #16a34a`、`--danger #dc2626`；正文 `#1e293b` / 次要 `#64748b` / 边框 `#e2e8f0` / 背景 `#f8fafc`
- 字体栈：Inter / SF Pro Text / -apple-system / PingFang SC / 微软雅黑
- 侧栏 224↔68px（localStorage `ipm_sb`）；**aside `md:sticky md:top-0 md:h-screen` 固定视口**，nav 区 flex-1 overflow-y-auto，用户区固定底部常显；active 浅蓝底 + 左 3px 深蓝条
- 顶栏为全局 sticky 页面工具栏：显示页面英文分类、中文标题、说明和右侧主操作；页面通过 `WorkspacePageHeader` 注入内容，移动端同时保留菜单入口
- 编辑器弹窗宽 1152px（max-w-[1152px]）；详情头部绿色「✓ 标记已完成」
- 下拉/弹窗白底（不用玻璃）；表格编号 tabular-nums；卡片 rounded-xl
- 登录页：径向渐变蓝紫 + 白卡 + 顶部渐变条；favicon = `app/icon.jpg`（SEAN logo）
- 参考项目：7007 ego-journal / 7009 corpculture（Liquid Glass 蓝本 #4f6ef7）；UI-DESIGN-SYSTEM.md 在公司 Github 根

---

## 10. 近期变更明细（按天，09-06 → 09-11）

### 09-11（今日）
1. **项目列表状态分栏**：新增「已完成」页签，顺序为「项目 / 已完成 / 已归档 / 全部」；默认项目页仅含 DRAFT、PLANNED、IN_PROGRESS、WAITING_ACCEPTANCE、ON_HOLD，COMPLETED 和 ARCHIVED 分别进入独立页签
2. **统一固定页面工具栏**：新增 `WorkspaceShell` / `WorkspacePageHeader`，Overview、Projects、Archive、分享与设置页面的标题、说明锁定在顶部；正文不再重复标题区
3. **主操作统一右置**：新建项目、新建账号、新建部门、新建类型、新建分享链接统一进入顶部工具栏右侧；桌面与移动端共用
4. **部署、资料与归档清单优化**：部署卡片支持编辑；资料拆分为「文档」和「图片」，图片可多选批量上传；归档清单加入中文说明、分值和悬停检查标准
5. **部署主机标准化**：`192.168.1.246` 统一登记为「业务管理部03」，`192.168.1.73` 统一登记为「业务管理部02」；通过部署修改服务写入并留下审计记录

### 09-10

1. **恢复 3010 服务**：确认宕机根因是手工运行的 Next.js 进程不存在，PostgreSQL 与项目数据始终正常
2. **应用生产容器化**：新增 Node 20 Alpine 多阶段 `Dockerfile`、`compose.yaml`、安全构建忽略规则和容器入口脚本；生产构建完整通过
3. **自启动与持久化**：`ipm-app` / `ipm-postgres` 均设置 `restart: unless-stopped`，Docker Desktop 已启用 AutoStart；`storage/` 绑定挂载，上传文件不随容器重建丢失
4. **运行验证**：`ipm-app` 状态 healthy，`/api/health` 返回 app/database 均为 ok，`http://192.168.1.246:3010/login` 返回 200；受控重启后再次健康
5. **生产登录 Cookie 修复**：容器生产模式原先自动写入 `Secure` Cookie，局域网 HTTP 浏览器会拒收，表现为密码正确但登录后仍回到登录页。新增 `COOKIE_SECURE` 环境项，Compose 对当前 HTTP 部署显式设为 `false`；实测登录 200、Cookie 已保存、`/api/auth/me` 返回 admin/ADMIN

### 09-09
1. **进度更新回填机制落地并回填 5 批**：试点 0023 HR(11 条) → 0010 文化积分(11) + 0011 众瀚四季(10) → 0001 装箱计算器(14) + 0002 Doc-Slim(6) → 0017 FastGPT(7) + 0021 NewsNow(6)。累计 8 个项目 66 条；每批读取项目记忆或用 Git/Docker/项目文档交叉验证，双写 ProjectUpdate+ProjectTimelineEvent，lastUpdateAt 同步
2. **前端 3 项修改**：① sidebar.tsx aside 加 `md:sticky md:top-0 md:h-screen` → 侧栏固定不随内容滚、用户区（Admin/系统管理员/改密/退出）常驻底部；② 分享弹窗加「全选已归档」按钮；③ 修复全选已归档累积逻辑 bug → 替换语义
3. **六项任务（前日启动今日收尾）**：见 §3；含部门两级分类、星级、改密 API
4. **时区验证坑确认**：Prisma DateTime = PG 无时区 timestamp；验证 +8h 而非 AT TIME ZONE（§7-7）

### 09-08
1. 编辑器补「进度/状态/实际完成日期」控件 + touchesCritical/CRITICAL_FIELDS；详情页 QuickStat 4→5 格
2. 22 项归档时间回填 docker StartedAt；archive fmtDate 改 formatDateTime
3. 六项任务主要代码（rating 星级/部门 category/改密/» 图标/acceptanceCriteria/pageSize 100）
4. git 远端建仓 + push（3e2d751）

### 09-07
1. ARCHIVE_STATUSES 只含 ARCHIVED；ACTIVE 含 COMPLETED；tab「进行中」→「项目」+ 9 状态筛选
2. 21 项补 DOCUMENT + SCREENSHOT → 完整度 20×100 + 1×90
3. PRJ-2026-0023 HR 简历工具入库（8765）；UI 全面模仿 8765（侧栏/顶栏/登录/archive 三表）
4. 端口排序（sort enum 'port' + 内存二次排）；SEAN logo + 「项目管理中心」

### 09-06（P0 落地日）
架构确认 → 全栈 P0 → Share Bundle → Settings 三页 + 数据重置 → 21 项 Docker 资产批量入库 → 归档完整度滞后 bug → apiFetch 信封统一

---

## 11. 已知坑与操作注意（运维备忘）

- **批量 SQL 通道**：git-bash `/tmp` 是 WorkBuddy 沙箱虚拟路径，`docker cp` 不识别 → 唯一可靠方式：SQL 写项目根 `.tmp_*.sql` → `cat .tmp_*.sql | docker exec -i ipm-postgres psql -U ipm -d ipm` → `rm` 清理
- **时区验证**：`ProjectUpdate.createdAt` 等是 PG 无时区 timestamp（存 UTC 墙钟）→ 验证用 `to_char(createdAt + INTERVAL '8 hours','YYYY-MM-DD HH24:MI')`
- **prisma generate EPERM**：先停 dev server 再 generate，完毕再启
- **Next dev 启动**：先 Python 递归清 .next（safe-delete 拦 shell rm 批量删）
- **生产服务启动**：优先使用 `docker compose up -d app`；容器已配置自动重启，不要再依赖长期挂着的 `npm run dev` 终端
- **Docker 构建基础镜像**：当前使用本机已有 `node:20-alpine`；Docker Hub 鉴权偶发超时，除非必要不要切换到未缓存的新标签
- **数据库容器归属**：`ipm-postgres` 是既有独立容器，不在 `compose.yaml` 内；应用入口会把 `.env` 中的本地主机地址转换为 `host.docker.internal`
- **HTTP 登录 Cookie**：生产环境默认 Secure；当前内网仍是 HTTP，因此 `compose.yaml` 显式设置 `COOKIE_SECURE=false`。启用 HTTPS 时必须改回 `true`
- **docker inspect 直查**：容器名按 deployment.serviceName 匹配，中文/特殊名用端口兜底
- **列表分页**：默认 pageSize=20，批量处理全量用 pageSize=100
- **编号验证**：先排除软删（deletedAt 非空）记录（0004 曾误导「0004=Prompt Hub」）
- **批量脚本路径（Windows）**：git-bash `/c/...` 给 Windows 原生 python/curl 读不到，用 `cygpath -w` 或全 Python

---

## 12. 文档索引

| 文档 | 内容 |
|---|---|
| `docs/architecture/01~08-*.md` | 产品架构/ER/权限/UI/API/ADR-08 AI/P0-P3 计划/风险安全（设计蓝图，细节以本文+代码+DB 为准） |
| `docs/P0-SCOPE.md` | P0 范围界定 |
| `.workbuddy/memory/2026-09-06~09.md` | 每日工作日志（架构/P0/入库/六项任务/回填批次全记录） |
| `.workbuddy/memory/MEMORY.md` | 长期记忆（铁律精炼版，与本文 §7 互为印证） |
| `public/artifacts/hr-system-progress-timeline.html` | HR 进度时间轴可视化（演示产物） |
| `CODEX-HANDOVER.md`（本文件） | ⚠️ 上版在 git 3e2d751 中，本版为 09-10 最新 |

---

> **给 Codex 的一句话**：系统数据库稳定，当前**最高优先 = Task B 进度回填**（每批 2 个项目，下一批 5050 汇率 + 5051 email-web），优先读取各项目 `.workbuddy/memory/`；缺失时以 Git、Docker 元数据和项目文档交叉验证，务必真实准确、不编造、不含密钥。
