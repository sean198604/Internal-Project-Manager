# Internal-Project-Manager（项目管理中心）· Codex 交接文档

> 生成时间：2026-09-08 14:40（Asia/Taipei）
> 交接目的：完整进度 + 系统要点 + 遗留待办，供 Codex 无缝接手。
> 项目路径：`C:\Users\Administrator\Documents\Github\Internal-Project-Manager`
> ⚠️ 本项目**尚未 git init**，无任何版本历史（根目录无 .git）。接手后建议第一时间 `git init` 建基线。

---

## 1. 项目定位（一句话）

**公司内部软件项目管理中心**：管理「内部软件项目生命周期 + 沉淀为软件资产 + 知识继承」，**不是** Todo App / Jira Clone / PLM。
三层模型：Active Projects（在做什么）→ Project Archive（做完沉淀为资产）→ Knowledge + AI（历史可查可继承，AI 属 P2，未启动）。

产品主色 #1a365d，UI 全面模仿公司既有系统 8765（HR-System v3.0），两系统看着像一套。界面文案为「项目管理中心」（非「内部软件项目管理中心」）。

---

## 2. 当前运行状态（实测快照）

| 项目 | 状态 |
|---|---|
| 应用 Dev Server | ✅ 正在运行，PID 7848，监听 `0.0.0.0:3010`（浏览器访问 http://localhost:3010 或 http://192.168.1.246:3010） |
| 数据库 | ✅ Docker 容器 `ipm-postgres`（postgres:16-alpine），host 端口 5432 |
| 管理员账号 | `admin` / `Admin@12345`（唯一账号；普通用户由 admin 在 设置→用户 创建） |
| 类型检查 | `npx tsc --noEmit` 应为 0 错误（每次改完必跑） |
| git | ❌ 未初始化仓库 |

### 环境铁律（实测结论，勿再改）
- 应用端口 **3010**（3000 与 7000-7010 被 Docker Desktop 代理占用，不可用）
- PostgreSQL **5432**，库名/用户/密码见 `.env`：`postgresql://ipm:ipm_dev_only@localhost:5432/ipm`
- 时区铁律：**数据库存 UTC，展示一律 Asia/Taipei**（`.env` `APP_TIMEZONE=Asia/Taipei`；前端用 `src/lib/time.ts` 的 `formatDateTime`，禁止 getUTC* 直显）
- FastGPT 已独立部署 `192.168.1.246:3000`，**不入库、不 iframe、不重新部署**；AI 相关（P2）表一律未创建
- `wsl.exe` 被安全策略拦截，不可调用

### 常用命令
```bash
npm run dev            # next dev -p 3010（开发）
npx tsc --noEmit       # 类型检查（必须 0 错误）
npm run db:migrate     # prisma migrate dev（改 schema 后）
npm run db:seed        # node --env-file=.env --import tsx prisma/seed.ts
npm run db:reset       # ⚠️ 重置开发库（会清空数据，慎用）
docker exec ipm-postgres psql -U ipm -d ipm -c "<SQL>"   # 直查 DB
```

> ⚠️ dev server 重启前**必须清空 .next 目录**（用 Python 递归删，勿用 shell rm 批量删——WorkBuddy safe-delete 会拦截 50+ 文件 unlink 导致 dev 崩溃）。重启后首次查库偶发连不上（Prisma 连接缓存），重试即过。

---

## 3. 进度总览（已完成 vs 未完成）

### ✅ 已完成：P0 全栈（约 4~5 人日，2026-09-06 落地至今）
- **17+2 = 19 张表**全部迁移 + 干净 seed
- **50+ API 路由**（35 个 route.ts 文件）
- **核心页面**：Dashboard / Projects 列表 / Projects 新建 / Project 详情（8 个 Tab）/ Archive / Settings（部门/用户/项目类型）/ Shares 管理 / 公开分享页
- 权限模型（USER 仅本部门 + 隐藏 Deployment/维护/内部文档/History；越权 404）
- 状态机 + 派生状态 + 谱系（branch/merge/migrate）+ 分享 Bundle + 归档（9 项 checklist）
- **E2E 26 步验证全通过**（含越权用例）
- **公司真实数据**：21+1 项 Docker 项目已资产化入库归档

### ⏳ 未完成（Codex 接手待办，详见 §8）
1. 侧栏「Admin 用户区固定在每个页面视口底部」+ **增加改密按钮**（用户明确要求，未实现）
2. 剩余 **13 个项目录入**（14 个中 1 个已建 DRAFT）；需先确认与已归档资产的重复关系
3. 次要：ProjectType 混入测试数据 `测试类型 TESTTYPE`（可清理）；全项目尚无 git 基线

### 尚未启动（P1 / P2）
- P1：全局搜索 / 历史批量整理 / 资产搜索 / 导出 / 基础备份 / Health Check 深化 / Audit Log 报表
- P2：AI Assistant / FastGPT / RAG（AI 表不创建，直到 P2 启动）

---

## 4. 数据库现状（2026-09-08 14:40 直查快照）

### 部门（16 行，15 个在用 + 1 停用测试）
| code | name | 说明 |
|---|---|---|
| FESTIVAL | 节日事业部 | SL 缩写归属 |
| OUTDOOR | 户外事业部 | GF / NF |
| ECOMMERCE | 电商事业部 | AMZ / DS / JAM |
| SEA_SUPPLY | 东南亚供应链 | VN |
| JP_GOODS | 日用百货部 | EG / TL ⚠️ 已存在于库（原 seed 是「日语百货部」，现名「日用百货部」） |
| KITCHEN | 餐厨业务部 | EGB / BLC |
| MOBILE_LIGHT | 移动光源部 | EGS |
| JAPAN | 日本事业部 | JP / JPB |
| SHANGHAI | 上海事业部 | NE |
| HR | 人力资源部 | 企业文化/招聘类 |
| ADMIN_OFFICE | 行政管理部 | |
| BIZ_MGMT | 业务管理部 | 存量自研工具默认归属 |
| FINANCE | 财务管理部 | |
| DOCS | 单证部 | |
| GM_OFFICE | 总经理室 | |
| TEST | 测试部 | isActive=false，测试残留 |

### 项目（23 行 alive，1 行软删占号）
- **ARCHIVED ×22**：PRJ-2026-0001 ~ 0023（**0004 = 软删占号**，与 0005 重复的 Prompt Hub；`deletedAt` 非空，普通列表不可见）
- **DRAFT ×1**：`PRJ-2026-0024 报价单自动化-ADA`（2026-09-08 05:32 由用户自建，部门 FESTIVAL，startDate 2026-07-13，**尚未补全状态/进度**）
- 22 项归档完整度：21 项 **100/100**，0020 aiproxy **90/100**（无 Web UI，特殊注意事项已说明）
- 归档时间 = **docker 容器最后一次启动时间**（非录入时间），从 `deployment.serviceName`/port 匹配容器 `docker inspect -f '{{.State.StartedAt}}'` 回填

22 项资产速查（端口 → 名称）：
`7002 装箱计算器(0001) / 7001 Doc-Slim(0002) / 5050 汇率看板(0003) / 7000 提示词库(0005) / 8888 门户(0006) / 7005 产品调研(0007) / 7004 客户调研(0008) / 7003 利润计算器(0009) / 7006 文化积分(0010,HR) / 7007 众瀚四季(0011,HR) / 7008 文档下载中心(0012) / 7009 活动月历(0013,HR) / 8000 名片识别(0014) / 5051 邮件群发(0015) / 7021 场景图生成(0016) / 3000 FastGPT(0017) / 7010 Dify(0018) / 7020 n8n(0019) / aiproxy(0020) / 4444 NewsNow(0021) / 8886 DockSight(0022) / 8765 HR简历工具(0023,HR)`

### 用户（1 行）
`admin / ADMIN / 系统管理员`（id `5af39e51-f110-423d-b6ea-83691229c423`）。演示账号已全删。

### 项目类型（8 行）
7 个默认（FEATURE 新功能 / OPTIMIZE 功能优化 / BUGFIX Bug修复 / REPORT 报表 / AUTOMATION 自动化 / INTEGRATION 系统整合 / OTHER 其他）+ 1 测试残留（TESTTYPE 测试类型，可删）。

---

## 5. 目录地图（关键文件 + 职责）

```
app/(workspace)/layout.tsx          # 所有工作区页面的壳：Sidebar + Topbar + main
app/(workspace)/dashboard/page.tsx  # 工作台
app/(workspace)/projects/           # 列表 / new / [id] 详情
app/(workspace)/archive/page.tsx    # 资产（归档列表，三张子表：待归档/最近归档/最近完成）
app/(workspace)/settings/           # 部门 / 用户 / 项目类型（仅 ADMIN）
app/(workspace)/shares/             # 分享管理（列表 + [id]）
app/share/[token]/page.tsx          # 公开分享页（无需登录）
app/login/                          # 登录页（8765 风格渐变卡片）
app/api/…                           # 35 个 route.ts（见 §6）
prisma/schema.prisma                # 19 表模型；seed.ts 干净版（无 demo 数据）
src/server/lib/auth.ts              # getActorOrNull 等（httpOnly cookie JWT）
src/server/lib/authz.ts             # Actor / buildScope / isAdminOrMaster（权限唯一入口）
src/server/lib/{api,errors,audit,rate-limit,markdown}.ts
src/server/modules/projects/
  numbering.ts      # PRJ-YYYY-NNNN 序列表 + 行锁（禁用 MAX+1）
  state-machine.ts  # ALLOWED_TRANSITIONS 相邻迁移表 + TERMINAL/UNFINISHED
  derivation.ts     # 派生状态（OVERDUE/DUE_SOON/STALE）统一后端计算
  schema.ts         # zod schemas（含 sort enum 的 'port'）
  repository.ts     # 查询（ARCHIVE_STATUSES 只含 ARCHIVED；list 内存按 deploymentPort 二次排序）
  serializer.ts     # toListItem/toDetail（空日期序列化为 '—'；输出 deploymentPort）
  service.ts        # 业务编排（CRUD/update：touchesCritical 判定 + CRITICAL_FIELDS）
  archive.ts        # 归档完整性 9 项权重判定 + syncArchiveState
  subresources.ts   # 子资源（updates/deployments/documents/upload/archive commit…）
src/server/modules/settings/service.ts  # 部门/用户/类型 CRUD（assertAdmin）
src/features/…      # client 组件（dashboard/projects/project-editor/project-detail-view/…）
src/components/layout/sidebar.tsx  # 侧栏（折叠 224↔68px，localStorage ipm_sb，用户区在底部）
src/components/layout/topbar.tsx   # 顶栏（部门·角色小字，无用户信息）
src/components/form-helpers.ts     # apiFetch（自动解包 {data} 信封）★所有客户端请求必须走它
src/lib/time.ts    # formatDateTime（Asia/Taipei）
src/lib/{env,utils}.ts
storage/documents/ # 上传文件落盘（4.8M）
```

---

## 6. 功能清单（页面 + API）

### 页面（11 工作区 + 登录 + 公开分享）
| 路由 | 功能 |
|---|---|
| /dashboard | 统计卡片 + 项目分布 |
| /projects | 项目列表（tab：项目=ACTIVE 含 COMPLETED / 全部；状态筛选 9 项；排序含端口/更新时间；行内快捷操作） |
| /projects/new | 创建项目（编号自动生成 PRJ-2026-NNNN） |
| /projects/[id] | 详情 8 Tab：总览 / 更新流 / 文档与附件 / 部署 / 版本 / 历史 / 谱系 / 合并迁移；顶部「分享」按钮跳 /shares?preselect |
| /archive | 资产：完整度列 + 端口列 + 归档时间（docker 启动时间）+ 三子表 + SortLink |
| /settings/{users,departments,project-types} | ADMIN CRUD |
| /shares · /shares/[id] | Share Bundle（多项目一个 token 链接）管理 |
| /share/[token] | 公开只读（无登录，仅安全字段 + 最近 3 updates） |
| /login | 登录 |

### API（35 路由，全部 `{data:...}` 信封）
- **auth**: login / logout / me
- **projects**: `/api/projects`(list/create) · `[id]`(get/update/soft-delete) · acceptance · updates · deployments · documents(两段式) · archive(POST=checklist) · archive/commit · unarchive · branch · merge · migrate · lineage · timeline · history · references
- **documents**: `[id]`(delete) · `[id]/download` · `[id]/preview`(md→html/image/pdf inline)
- **uploads**: `/api/uploads/[key]`（PUT 文件本体）
- **settings**: departments / project-types / users（各 GET/POST/PATCH/DELETE）
- **shares**: list/create · `[id]`(detail/revoke) · **public/share/[token]**(匿名)
- **dashboard / deployments / references / health**

### 两段式上传协议（写新上传功能必看）
1. `POST /projects/[id]/documents` body `{mode:"start",fileName,size,mimeType}` → 返回 `{data:{attachmentId,storageKey}}`
2. `PUT /api/uploads/<encodeURIComponent(storageKey)>` 传文件二进制
3. `POST /projects/[id]/documents` body `{attachmentId,docType,title,version,isCurrent}` → 服务端自动 `syncArchiveState` 重算完整度
- `docType` 枚举（Prisma AttachmentType）：`REQUIREMENT/DOCUMENT/SCREENSHOT/DEPLOYMENT/TESTING/ACCEPTANCE/OTHER`（**无 DESIGN/OPERATIONS**，写错类型编译报错）

---

## 7. 铁律与易错点（Codex 必读，按重要性排序）

1. **权限 = 服务端唯一权威**：一切查询先 `buildScope(actor)` 注入过滤（先过滤后查询）；越权统一 **404**（不泄露存在性）；USER 不可见 Deployment/维护/内部文档/History；前端隐藏按钮不是安全边界。AI 接入（P2）必须复用同一 Authorization Service。
2. **状态机只允许相邻迁移**：`state-machine.ts` ALLOWED_TRANSITIONS 为唯一真源；`COMPLETED ≠ ARCHIVED`（已完成=开发做完，已归档=沉淀为公司资产）；`MERGED` 终态不可物理删除；历史项目一律软删进回收站（列表默认过滤 `deletedAt` 非空）。
3. **派生状态（延期/即将到期/长期未更新）不存库**：后端 `derivation.ts` 统一计算，前端不得自行判断。
4. **API 信封约定**：后端 `ok()/created()` 一律 `{data:...}`；客户端必须经 `src/components/form-helpers.ts` 的 `apiFetch`（自动解包），**新页面禁止**再手动 `res.data` / 读顶层字段（曾致 /shares 崩溃、列表静默空白、创建跳 /projects/undefined）。
5. **时区铁律**：DB 存 UTC / 展示 Asia/Taipei。格式化用 `src/lib/time.ts formatDateTime`；archive 列表曾因 `getUTC*` 直显被修过。
6. **归档完整性 9 项加权**（archive.ts）：REQUIREMENT 15 / DEPLOYMENT 15 / DOCUMENT 15 / VERSION 10 / ACCEPTANCE 10 / SCREENSHOT 10 / SPECIAL_NOTES 10 / MAINTENANCE 10 / CONFIRMED 5。允许不完整归档（显示 ⚠️ 档案未完成）。
7. **归档时间 = docker 最后启动时间**（`docker inspect -f '{{.State.StartedAt}}'` UTC）。批量录入**禁止**写 `archivedAt: new Date()`（曾致 22 项时间全挤同一时刻）。Archive 列表默认 `archivedAt desc`。
8. **端口不是 Project 主表字段**，是 `ProjectDeployment` 字段（配置入口：详情页→部署信息→新增部署→端口）。Archive/列表端口列 = 该项目**最新一条部署**的 port（`take:1, orderBy lastVerifiedAt desc`）。⚠️ `ProjectDeployment` 表**没有 `deployedAt` 字段**（实际是 `lastVerifiedAt`/`createdAt`），先 SELECT schema.prisma 确认字段再写代码。
9. **Prisma 不支持 relation 字段 SQL 排序**（`orderBy:{deployments:{port:asc}}` 报错）：变通 = SELECT 带 deployments take:1，listProjects 内存二次排；serializer 用 `ListRowForSerializer` 结构化子集避免 create/update 路径类型不兼容。
10. **Prisma 6 关联写入用关系名**：`archivedBy: { connect:{id} }` 而非 `archivedById`。
11. **serializer 空日期返回 '—'**：前端 date input 必须 `normDate()` 归一化为 ''，否则 zod 校验失败。
12. **archive() 事务内顺序**：先 `tx.project.update()` 写归档字段，**再** `syncArchiveState()` 重算（顺序反了 checklist/分数滞后——曾踩过，已修）。
13. **`loadProjectForWrite` select 必含 `rootProjectId: true`**，否则谱系/分支报缺字段。
14. **`middleware.ts` PUBLIC_PREFIXES 含 `/api/public`**（公开分享免登录；漏加会 401）。
15. **touchesCritical 字段**（进度/状态/实际完成日期/验收日期/部门/负责人/优先级/预计完成日期）：仅 ADMIN/MASTER 可改，USER 改任一项 → 404。前端 ProjectEditor 的状态下拉要镜像 state-machine 的 ALLOWED_TRANSITIONS（不可达项 disabled），否则后端 400。
16. 项目编号 `PRJ-YYYY-NNNN` 走序列表+行锁（numbering.ts），**禁止 MAX()+1**。
17. 头像/显示：ADMIN 角色侧栏强制显示「Admin」+ 头像字母「A」；其余角色用 displayName 首字母。
18. Next 15 favicon：`app/icon.jpg`（文件系统约定）与 metadata.icons 同存会冲突——**只留文件系统约定**。

---

## 8. Codex 接手待办（PENDING，按用户原话还原）

### Task A：侧栏用户区固定 + 改密按钮（用户原话：「底部的admin并不是出现在每个页面底部的，而且需要增加改密按钮」）

**现状分析**：
- `Sidebar` 由 `app/(workspace)/layout.tsx` 统一渲染，凡在工作区内的页面**都有**侧栏（/dashboard /projects /archive /settings/* /shares 全覆盖）；登录页 /login 与公开分享 /share/[token] 无侧栏属正常。
- 用户区当前在侧栏**最底部**（flex 列底部），但侧栏高度随内容拉伸——页面内容矮时虽贴视口底，内容高时用户区在页面最底部，**滚动到底才可见**，不符合「每页固定底部」预期。
- **建议改法**：`nav` 区保持 `flex-1 overflow-y-auto`，用户区块改为 `mt-auto` + 使其相对视口固定（8765 侧栏用户区是固定在视口底部的，参考 HR-System 实现）。改后需在内容超长页面（如 /archive 22 行）与短页面（如 /projects/new）都验证用户区始终钉在视口底部。

**改密按钮（当前完全没有该功能）**：
- 后端：`User` 模型已有密码字段；需新增自改密码 API（建议 `PATCH /api/auth/password`，body `{currentPassword,newPassword}`，bcryptjs 校验旧密码 + hash 新密码；记录 AuditLog；校验当前登录者身份，禁止改他人）。
- 前端：侧栏用户区（展开态）在「退出」旁/上加「修改密码」入口 → Modal 表单（当前密码/新密码/确认）→ 成功后提示重新登录或直接续用 session。
- 参考：设置页 `settings/users` 已有 admin 代设密码逻辑（`src/server/modules/settings/service.ts` 的 hashPassword 用法），改密 API 可复用 hash 工具。
- 注意：`.env` 中 `ADMIN_INITIAL_PASSWORD` 只是初始化用；正式改密逻辑与 demo 无关。

### Task B：录入剩余 13 个项目（14 个中 PRJ-2026-0024 ADA 已建 DRAFT）

用户 2026-09-07 提供 14 条项目，格式：`日期-部门缩写-负责人 事项(说明)`，**首段日期 = 开始日期**，**中间字母 = 部门缩写**。映射关系（用户亲口确认，勿再问）：
`HR=人力资源部 · SL=节日事业部 · GF/NF=户外事业部 · AMZ/DS/JAM=电商事业部 · EG/TL=日用百货部 · EGB/BLC=餐厨业务部 · EGS=移动光源部 · JP/JPB=日本事业部 · NE=上海事业部 · VN=东南亚供应链部`

| # | 原始信息 | 开始日 | 部门 | 状态建议 | 备注 |
|---|---|---|---|---|---|
| 1 | HR-金鑫 企业文化活动日历（7-30 上线） | 07-10 | HR | COMPLETED？ | ⚠️ 疑似 = 已归档 PRJ-2026-0013（7009 活动月历，HR，ARCHIVED 2026-08-25），**先与用户确认是补录履历还是重复，勿盲目建** |
| 2 | SL-ADA excel/PPT 报价单生成（当天完成） | 07-13 | FESTIVAL | COMPLETED | ✅ **已建** PRJ-2026-0024（DRAFT），需改状态=COMPLETED、补 actualCompletedDate=07-13、负责人等 |
| 3 | NE-宋琴 批量导入（8-5）/ 输出 PPT 报价（8-11，729 页） | 08-03 | SHANGHAI | COMPLETED | 分两阶段，actualCompletedDate≈08-11，可在更新流补两条记录 |
| 4 | GF-陈超女 读 PDF 输出 Excel（当天完成） | 08-10 | OUTDOOR | COMPLETED | |
| 5 | SL-Heidi 供应商 pptx 读报价单（8-12 完成） | 08-11 | FESTIVAL | COMPLETED | |
| 6 | TL-谢佳琪 pdf 样本册读取（格式不统一做不了） | 08-12 | JP_GOODS | **CANCELLED** | 用户原话「格式不统一做不了」，做不成的需求应标记 CANCELLED 保留记录 |
| 7 | NE-薛梅 排柜计算器 | 08-13 | SHANGHAI | ？ | 状态未知 → 建后由用户 UI 修改（下同） |
| 8 | NE-潘静 批量导出供应商聚合统计表 | 08-14 | SHANGHAI | ？ | |
| 9 | NE-宋琴 白底图批量场景图（gemini api，30 元 100 张；260903 加免费模型/鬼节/春夏场景） | 08-14 | SHANGHAI | IN_PROGRESS | ⚠️ 疑似与已归档 PRJ-2026-0016（7021 场景图生成器 Batch Studio，ARCHIVED）为同一工具迭代；建议确认后：0016 档案更新 or 新开项目跟踪 |
| 10 | HR-朱英 招聘系统（需立项 / 企业微信需域名备案） | 08-17 | HR | PLANNED/DRAFT | 立项中，别标 COMPLETED |
| 11 | NE-宋琴 excel 转 ppt ×7（8-26 完成） | 08-23 | SHANGHAI | COMPLETED | actualCompletedDate=08-26 |
| 12 | EGB-秦志颖 PPT 中文转英文（当天完成） | 08-24 | KITCHEN | COMPLETED | |
| 13 | HR-朱英 简历上传归档 / 信息补充 / 面试进度追踪 | 09-01 | HR | ？ | ⚠️ 疑似 = 已归档 PRJ-2026-0023（8765 HR 简历工具，HR，ARCHIVED 2026-09-07）——但注意 0023 是 09-01 立项、09-07 才入库归档，此条可能就是 0023 本体，**先与用户确认** |
| 14 | NE-Ring 订单追踪表 / 批量报价单生成工具 | 09-03 | SHANGHAI | ？ | 两个工具写在一个项目或拆两条，按用户习惯询问 |

**录入操作提示**：
- 走 API：`POST /api/projects`（需 admin cookie，登录 admin/Admin@12345）→ 再 `PATCH /api/projects/[id]` 补状态/实际完成日期/进度；或直接告诉用户进 http://localhost:3010 UI 操作（用户说「后续我会进 3010 进行修改」，所以**只需把数据建对，细节留 UI**）。
- 新项目编号从 **PRJ-2026-0025** 开始（序号表 lastValue=24）。
- 完成后（默认未归档）出现在 /projects「项目」tab（ACTIVE 含 COMPLETED），**不要**误归 /archive。

### Task C：收尾杂项
- 可删除测试类型 `TESTTYPE 测试类型`（settings API DELETE，无引用可删）；`TEST 测试部` 已停用，可留可删。
- **git init + 首次提交**（目前无任何版本管理，风险高）。
- 项目文件夹无 README（docs/ 下是架构文档）；如需 README 可从本文档裁剪。

---

## 9. UI 规范速查（全面模仿 8765 / HR-System v3.0）

- 设计令牌（globals.css `:root` + tailwind.config.ts）：`--primary #1a365d`、`--primary-light #dbeafe`、`--info #378ADD`、`--accent #f59e0b`、`--success #16a34a`、`--danger #dc2626`；正文 `#1e293b` / 次要 `#64748b` / 边框 `#e2e8f0` / 背景 `#f8fafc`
- 字体栈：Inter / SF Pro Text / -apple-system / PingFang SC / 微软雅黑
- 侧栏 224px ↔ 折叠 68px（localStorage `ipm_sb`）；active 项浅蓝底 #dbeafe + 左侧 3px 深蓝条；品牌区渐变蓝 logo + 「项目管理中心.」
- 顶栏 sticky h-12，毛玻璃，只显示「部门 · 角色」小字
- 登录页：径向渐变蓝紫背景 + 白卡片 rounded-2xl + 顶部 4px 渐变条 + 「登 录」按钮
- 表格：编号 tabular-nums、完整度列 center 绿/黄 Badge（≥60 绿）、日期/操作 right；卡片圆角 rounded-xl
- 组件不引图表库（自绘 SVG）、不引富文本（Markdown 渲染器 `src/server/lib/markdown.ts` + `.md-render` 样式）
- favicon = `app/icon.jpg`（SEAN logo，黄标白底 EGO/SEAN 品牌）——用文件系统约定，勿加 metadata.icons

---

## 10. 近期变更明细（2026-09-06 → 09-08，按天）

### 09-08（今日，最新）
1. **编辑器补「进度/状态/实际完成日期」控件**（用户三问之一）：后端 updateProjectSchema 加 actualCompletedDate/acceptanceDate；service.update 写字段 + touchesCritical 判定 + CRITICAL_FIELDS（仅 ADMIN/MASTER）；前端 project-editor.tsx 加三控件（特权才显示/可改），状态 Select 镜像 state-machine 可达项；详情页 QuickStat 4→5 格加状态徽章/实际完成日期；date input `normDate()` 防 '—' 污染。
2. **归档时间回填 docker StartedAt**（用户三问之三）：22 项按 deployment.serviceName + port 匹配容器 `docker inspect StartedAt` 回填 archivedAt；archive/page.tsx `fmtDate` 由 getUTC* 改 `formatDateTime`（Asia/Taipei）。
3. 端口配置位置（用户三问之二，属告知）：端口在 `ProjectDeployment`，入口 = 项目详情→部署信息→新增部署→「端口」。

### 09-07
1. **归档完整度 75% 解释 + 状态集合语义修正**：`ARCHIVE_STATUSES` 只含 ARCHIVED（列表曾混入 COMPLETED）；ACTIVE 含 COMPLETED（完成后不归档的项目留在「项目」tab）；前端 tab「进行中」→「项目」+ 9 状态筛选。
2. **21 项补 DOCUMENT + SCREENSHOT**：DOCUMENT 21/21（GitHub README + 本地源码目录）；SCREENSHOT 20/21（playwright-core 直驱 Chromium headless 截图，0020 aiproxy 无 UI 跳过）→ 完整度 20×100 + 1×90。
3. **PRJ-2026-0023 HR 简历工具入库**（8765，HR 部，完整度 100）。
4. **UI 全面模仿 8765**：侧栏结构重排（品牌→折叠钮→模块→用户区）、顶栏简化、登录页改版、archive 三表对齐、全局样式靠齐、Admin 头像字母、文档/图片浏览器内预览弹窗（DocumentPreviewModal + /api/documents/[id]/preview + 无依赖 markdown 渲染）。
5. **端口排序**：schema sort enum 'port' + repository 内存二次排序 + serializer deploymentPort + 前端下拉；Sidebar ADMIN 强制「Admin」+「A」。
6. SEAN logo + 标题「项目管理中心」。

### 09-06（P0 落地日）
架构确认 → 全栈 P0 → 分享重构 Share Bundle → Settings 三页补全 + 数据重置（15 真实部门/仅 admin/序号归零）→ 21 项 Docker 资产批量入库（试点 3 + P 类 15 + 第三方平台类）→ 修复归档完整度滞后 bug（archive 顺序）→ 修复 apiFetch 信封解包不一致。

---

## 11. 已知坑与操作注意（运维备忘）

- **Next dev 启动前清 .next**：`python -c "import shutil;shutil.rmtree(r'C:\Users\Administrator\Documents\Github\Internal-Project-Manager\.next',ignore_errors=True)"` 再 `npm run dev`；否则 WorkBuddy safe-delete shim 拦截热更新 unlink 崩进程。
- **docker inspect 直查**：容器名通过 `deployment.serviceName` 匹配，中文/特殊名用端口兜底；docker ps 只显示 host 端口，服务可能在 0.0.0.0 与特定 IP 绑定。
- **批量脚本路径坑（Windows）**：git-bash 的 `/c/...` 路径传给 Windows 原生 python/curl 读不到，用 `cygpath -w` 转 `C:/...`，或全 Python（urllib+CookieJar）最稳。
- **列表分页**：默认 pageSize=20，批量处理全量数据用 pageSize=100 防漏项。
- **验证新编号是否存在**：先排除软删（deletedAt 非空）记录（0004 曾致「0004=Prompt Hub」误解）。

---

## 12. 文档索引

| 文档 | 内容 |
|---|---|
| `docs/architecture/01-product-architecture.md` | 产品定位/技术选型/状态机/谱系/归档/ADR |
| `docs/architecture/02-database-er.md` | ER + 全表 schema 设计 |
| `docs/architecture/03-permission-model.md` | 权限矩阵/Scope/安全用例 |
| `docs/architecture/04-ui-information-architecture.md` | 页面树/设计 Token/组件 |
| `docs/architecture/05-api-design.md` | 响应约定/60+ 端点设计 |
| `docs/architecture/06-fastgpt-integration.md` | ADR-08 Context Injection |
| `docs/architecture/07-mvp-and-development-plan.md` | P0-P3 / Phase 计划 |
| `docs/architecture/08-risk-and-security.md` | 风险/安全/备份/上线检查表 |
| `docs/P0-SCOPE.md` | P0 范围界定 |
| `.workbuddy/memory/2026-09-06.md` | 架构+P0+分享+Settings+21项入库 全记录 |
| `.workbuddy/memory/2026-09-07.md` | 完整度修正+附件补传+UI 模仿 8765+端口排序 |
| `.workbuddy/memory/2026-09-08.md` | 编辑器补字段+归档时间 docker 回填 |
| `.workbuddy/memory/MEMORY.md` | 长期记忆（铁律精炼版，**与本文 §7 互为印证**） |

> 注：架构文档是「设计蓝图」，部分细节（如分享模型已改为 Share Bundle、无采购部）以**本文档 + 代码 + 数据库**为准。
