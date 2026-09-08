# 03 · 权限模型（Server-side Authorization）

> 唯一铁律：**权限判定只在服务端发生，且只有一个入口。**
> 前端隐藏按钮只是体验优化，**永远不是安全边界**。

---

## 1. 角色定义

| 角色 | 定位 | 默认账号 |
|------|------|---------|
| `ADMIN` | 系统管理员 | `admin` |
| `MASTER` | 主管 | `master` |
| `USER` | 需求部门普通用户 | 各部门自建 |

### 1.1 核心原则

> **ADMIN 与 MASTER 在项目业务操作上权限完全一致。**
> master **不是**「低配管理员」。
> 差异仅在**系统后台管理**：用户管理 / 部门管理 / 项目类型管理 / 审计日志 / AI 配置 → 仅 ADMIN。

---

## 2. 权限矩阵（正式版）

| 能力 | ADMIN | MASTER | USER | 判定函数 |
|------|:-----:|:------:|:----:|---------|
| 查看全部项目 | ✅ | ✅ | ❌ | `canViewAllProjects` |
| 查看本部门项目 | ✅ | ✅ | ✅ | `canViewProject` |
| 创建项目 | ✅ | ✅ | ✅ | `canCreateProject` |
| 编辑项目（通用） | ✅ | ✅ | 按 2.2 规则 | `canEditProject` |
| 添加项目更新 | ✅ | ✅ | 按 2.2 规则 | `canAddUpdate` |
| 修改关键字段（状态/健康/负责人/优先级/进度/到期日） | ✅ | ✅ | ❌ | `canChangeCriticalField` |
| 项目验收 | ✅ | ✅ | ❌ | `canAccept` |
| 项目归档 / 取消归档 | ✅ | ✅ | ❌ | `canArchive` |
| 项目迁移（跨部门） | ✅ | ✅ | ❌ | `canMigrate` |
| 项目合并 | ✅ | ✅ | ❌ | `canMerge` |
| 创建项目分支 | ✅ | ✅ | 按 2.2 规则 | `canBranch` |
| **查看部署信息** | ✅ | ✅ | **❌ 默认不可见** | `canViewDeployment` |
| 查看维护说明 / 特殊注意事项 | ✅ | ✅ | ❌ | `canViewMaintenance` |
| 查看内部技术文档 | ✅ | ✅ | ❌ | `canViewInternalDoc` |
| 管理文档（上传/删除） | ✅ | ✅ | 按 2.2 规则 | `canManageDocuments` |
| 下载文档 | ✅ | ✅ | 仅非内部类型 | `canDownloadDocument` |
| 生成 / 关闭分享链接 | ✅ | ✅ | ❌ | `canManageShare` |
| 查看项目历史 / 审计 | ✅ | ✅ | ❌ | `canViewHistory` |
| 软删除项目 | ✅ | ✅ | ❌ | `canDeleteProject` |
| 回收站 / 恢复 | ✅ | ✅ | ❌ | `canRestoreProject` |
| 用户管理 | ✅ | ❌ | ❌ | `isAdmin` |
| 部门管理 | ✅ | ❌ | ❌ | `isAdmin` |
| 项目类型管理 | ✅ | ❌ | ❌ | `isAdmin` |
| 审计日志查看 | ✅ | ❌ | ❌ | `isAdmin` |
| AI 配置 | ✅ | ❌ | ❌ | `isAdmin` |
| AI 使用 | ✅ | ✅ | ✅（结果按权限过滤） | `canUseAi` |
| 系统设置 | ✅ | ❌ | ❌ | `isAdmin` |

### 2.1 USER「按权限」的判定规则（2.2）

USER 对项目的可写权限，满足**任一**即可：

1. `project.ownerId === user.id`（项目负责人），**或**
2. `project.creatorId === user.id`（创建人），**或**
3. `project.departmentId === user.departmentId` **且** `project.allowDepartmentEdit === true`（项目开启部门协作编辑）

USER 的**只读**权限：`project.departmentId === user.departmentId`

### 2.2 权限枚举（代码常量）

```ts
export const Permission = {
  PROJECT_VIEW_ALL: 'project:view_all',
  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_UPDATE_ADD: 'project:update_add',
  PROJECT_FIELD_CRITICAL: 'project:field_critical',
  PROJECT_ACCEPT: 'project:accept',
  PROJECT_ARCHIVE: 'project:archive',
  PROJECT_MIGRATE: 'project:migrate',
  PROJECT_MERGE: 'project:merge',
  PROJECT_BRANCH: 'project:branch',
  PROJECT_DELETE: 'project:delete',
  PROJECT_RESTORE: 'project:restore',
  DEPLOYMENT_VIEW: 'deployment:view',
  MAINTENANCE_VIEW: 'maintenance:view',
  DOC_INTERNAL_VIEW: 'document:internal_view',
  DOC_MANAGE: 'document:manage',
  DOC_DOWNLOAD: 'document:download',
  SHARE_MANAGE: 'share:manage',
  HISTORY_VIEW: 'history:view',
  USER_MANAGE: 'user:manage',
  DEPARTMENT_MANAGE: 'department:manage',
  PROJECT_TYPE_MANAGE: 'project_type:manage',
  AUDIT_VIEW: 'audit:view',
  AI_CONFIG: 'ai:config',
  AI_USE: 'ai:use',
  SETTINGS_MANAGE: 'settings:manage',
} as const;
```

---

## 3. 作用域（Scope）—— 数据可见性根

### 3.1 Scope 计算（每个请求必过）

```ts
type ActorContext = {
  userId: string;
  role: Role;
  departmentId: string | null;
};

type Scope = {
  // 项目级：null 表示「无限制」
  projectDepartmentIds: string[] | null;   // ADMIN/MASTER = null（全部）
  // 敏感信息级
  canSeeDeployment: boolean;
  canSeeMaintenance: boolean;
  canSeeInternalDocs: boolean;
  canSeeHistory: boolean;
};

function buildScope(actor: ActorContext): Scope {
  if (actor.role === 'ADMIN' || actor.role === 'MASTER') {
    return {
      projectDepartmentIds: null,          // 全部可见
      canSeeDeployment: true,
      canSeeMaintenance: true,
      canSeeInternalDocs: true,
      canSeeHistory: true,
    };
  }
  return {
    projectDepartmentIds: actor.departmentId ? [actor.departmentId] : [],
    canSeeDeployment: false,               // ★ 即使项目属本部门
    canSeeMaintenance: false,
    canSeeInternalDocs: false,
    canSeeHistory: false,
  };
}
```

### 3.2 Scope 注入到查询层

**所有项目查询必须带 scope，禁止裸 `prisma.project.findMany()`。**

```ts
// ❌ 禁止
await prisma.project.findMany();

// ✅ 必须
await projectRepo.findMany(buildProjectWhere(scope, filters));
```

`buildProjectWhere()` 强制注入：

```ts
function buildProjectWhere(scope: Scope, filters: Filters) {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (scope.projectDepartmentIds !== null) {
    where.departmentId = { in: scope.projectDepartmentIds };
    if (scope.projectDepartmentIds.length === 0) {
      return { id: { in: [] } };           // 无部门用户 → 空集
    }
  }
  return { ...where, ...filters };
}
```

> **实现保障**：封装 `projectRepo`，**不直接导出 `prisma.project`** 给业务模块；用 ESLint 规则 `no-restricted-syntax` 禁止模块层直接使用 `prisma.project.*`。

---

## 4. 资源级访问规则

### 4.1 项目

```
GET /api/projects/:id
  1. 加载 project（含 deletedAt 检查）
  2. if (!scope.all) assert project.departmentId ∈ scope.departmentIds
  3. 否则 404（不是 403 —— 不泄露资源是否存在）
```

> **关键：越权访问一律返回 404，不是 403。**
> 403 会泄露「这个 ID 存在但你没权限」。

### 4.2 部署信息

```
GET /api/projects/:id/deployments
  if (!scope.canSeeDeployment) return 404
```

- **即使项目属于用户所在部门**，USER 仍不可见
- 项目详情 API 返回的 `deployments` 字段，对 USER **直接不下发**（不是下发后前端隐藏）

### 4.3 文档

| 文档类型 | ADMIN/MASTER | USER（本部门项目） |
|---------|:---:|:---:|
| `REQUIREMENT` 需求文档 | ✅ | ✅ |
| `ACCEPTANCE` 验收资料 | ✅ | ✅ |
| `OTHER` | ✅ | ✅ |
| `DOCUMENT`（开发/操作说明） | ✅ | 仅 `isInternal=false` |
| `DEPLOYMENT` 部署文档 | ✅ | ❌ |
| `TESTING` 测试报告 | ✅ | 仅 `isInternal=false` |

下载接口 `GET /api/documents/:id/download`：
1. 鉴权（会话 or 有效分享 token）
2. 校验该文档所属项目的 scope
3. **服务端流式返回**，永不暴露 storageKey / 真实路径

### 4.4 分享链接

```
GET /api/share/:token
  1. token 存在 && 未撤销 && 未过期
  2. 加载项目
  3. 若访问者已登录 → 仍走 Scope 判定（登录态优先，不因 token 提权）
     未登录   → 走「分享白名单字段」
  4. 分享页固定隐藏：Deployment / 维护说明 / 特殊注意事项 / 内部文档 / 审计 / 历史
```

**分享 Token 不提升权限。** 销售用户拿到采购项目 token → 仍 404。

### 4.5 回收站 / 审计 / 设置

- 回收站：ADMIN / MASTER
- 审计日志：仅 ADMIN
- 用户 / 部门 / 项目类型 / AI 配置：仅 ADMIN

---

## 5. Authorization Service（唯一入口）

```
src/server/lib/authz.ts
  ├── buildScope(actor)                    → Scope
  ├── assertProjectAccess(scope, project, action)  → void | throws NotFoundError
  ├── assertProjectWrite(scope, project, user)     → void | throws
  ├── assertPermission(user, Permission)           → void | throws ForbiddenError
  ├── filterProjectForActor(project, scope)        → SafeProject（字段级裁剪）
  └── buildAiContext(scope, query)                 → AiContext（见 06）
```

### 5.1 字段级裁剪（关键）

`filterProjectForActor()` 在**序列化层**裁剪，而非前端过滤：

| 字段 | USER 可见性 |
|------|:---:|
| `specialNotes` | ❌ |
| `maintenanceNotes` | ❌ |
| `handoverInfo` | ❌ |
| `deployments[]` | ❌ |
| `credentialLocation` | ❌ |
| `internalDocuments[]` | ❌ |
| 其余业务字段 | ✅ |

### 5.2 与 AI 共用

```
项目访问  ┐
          ├─→ Authorization Service ─→ Scope
AI 访问   ┘
```

**绝不允许出现「项目权限一套、AI 权限另一套」。**
AI Context Builder 复用同一个 `buildScope()`。

---

## 6. 认证实现

| 项 | 方案 |
|---|---|
| 会话 | JWT（jose, HS256）+ httpOnly Cookie |
| Cookie 属性 | `HttpOnly; SameSite=Lax; Secure(prod); Path=/` |
| 有效期 | 8 小时（内部系统，不做 refresh token） |
| 密码 | bcryptjs，cost=12 |
| 登录失败 | 5 次/15 分钟/IP 限流；**返回统一错误文案**（不区分「用户不存在」与「密码错误」） |
| 首次登录 | 强制改密码标记 `mustChangePassword` |
| middleware | 仅做「是否登录」粗粒度守卫；**细粒度必在 service 层** |
| RBAC 检查 | 每个 Route Handler 首行 `const actor = await requireActor()` |

### 6.1 关键：middleware 不是安全边界

Next.js middleware 可能被绕过（ matcher 配置遗漏、静态资源路径）。
**因此：每个 Route Handler / Server Action 内部必须独立调用 `requireActor()` + `assertPermission()`。**
middleware 只负责未登录跳转，减少无谓渲染。

---

## 7. 安全测试用例清单（实现后必须全部通过）

| # | 场景 | 期望 |
|---|------|------|
| S-01 | USER A 直接访问部门 B 项目 URL | 404 |
| S-02 | USER A 调用 `GET /api/projects/{B的id}` | 404 |
| S-03 | USER A 调用 `GET /api/projects/{B的id}/deployments` | 404 |
| S-04 | USER A 访问**本部门**项目的 deployments | 404 |
| S-05 | USER A 调用 `GET /api/documents/{B的docId}/download` | 404 |
| S-06 | USER A 用 curl 带 B 项目文档的 storageKey 拼 URL | 404（无静态直连） |
| S-07 | USER A 访问 `/settings/audit-logs` | 403 |
| S-08 | USER A 调用 `PATCH /api/projects/{id}` 改状态 | 403 |
| S-09 | USER A 调用 `POST /api/projects/{id}/archive` | 403 |
| S-10 | USER A 问 AI「项目 B 做了什么」 | 「没有找到你有权限查看的相关项目」，**无内容泄露** |
| S-11 | USER A 问 AI「项目 B 服务器 IP」 | 同上 |
| S-12 | USER A 问 AI「采购部有哪些系统」（无采购部权限） | 同上 |
| S-13 | USER A 拿到 B 的 share token | 404 / 拒绝 |
| S-14 | 未登录访问 `/projects` | 跳转 login |
| S-15 | 未登录调用 API | 401 |
| S-16 | 篡改 JWT payload | 401 |
| S-17 | USER A 调用 `POST /api/projects/{id}/migrate` | 403 |
| S-18 | USER A 访问 `/settings/users` | 403 |
| S-19 | 已软删除项目被直接访问 | 404 |
| S-20 | AI 返回的 source 链接，USER 点击 | 必须有权限；否则 404（**来源权限与正文一致**） |

> S-06 的实现关键：`storage/` 目录**不通过 Next.js public 暴露**，且不在 static 服务下。

---

## 8. 实现 Checklist

- [ ] `authz.ts` 单一入口，零业务逻辑耦合
- [ ] `projectRepo` 封装，ESLint 禁止模块层直接用 `prisma.project`
- [ ] Prisma middleware 自动注入 `deletedAt: null`
- [ ] 所有 Route Handler 首行 `requireActor()`
- [ ] 序列化层统一 `filterProjectForActor()`
- [ ] 越权统一 404（非 403）
- [ ] 文档下载走鉴权后的流式接口
- [ ] `storage/` 不进 public
- [ ] AI Context Builder 复用 `buildScope()`
- [ ] Playwright E2E 覆盖 S-01 ~ S-20
