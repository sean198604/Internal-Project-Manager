# 05 · API 设计

> REST · JSON · 统一响应封装 · 全部端点服务端鉴权

---

## 1. 通用约定

### 1.1 响应格式

**成功**
```json
{ "data": { }, "meta": { } }
```

**列表（带分页）**
```json
{
  "data": [ ],
  "meta": { "total": 128, "page": 1, "pageSize": 20, "totalPages": 7 }
}
```

**失败**
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "操作失败，请稍后重试",
    "traceId": "a1b2c3d4"
  }
}
```

> 生产环境 `message` 对用户统一为「操作失败，请稍后重试」。
> 真实错误写入服务端日志，通过 `traceId` 关联。
> 开发环境（`NODE_ENV=development`）返回详细 message 与 stack。

### 1.2 状态码

| 码 | 语义 | 使用场景 |
|---|------|---------|
| 200 | OK | 查询 / 更新成功 |
| 201 | Created | 创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Validation Error | zod 校验失败 |
| 401 | Unauthorized | 未登录 / Token 失效 |
| **404** | **Not Found** | **资源不存在 或 越权（统一 404，不泄露存在性）** |
| 403 | Forbidden | 已登录但角色不足（仅用于菜单级/管理端点） |
| 409 | Conflict | 状态机非法迁移 / 唯一约束冲突 |
| 422 | Unprocessable | 业务规则不满足（如档案完整度过低） |
| 429 | Too Many Requests | 登录限流 / AI 限流 |
| 500 | Server Error | 内部错误（不泄露细节） |

### 1.3 分页 / 排序 / 过滤

```
GET /api/projects?page=1&pageSize=20
                 &sort=updatedAt:desc
                 &departmentId=xxx&status=IN_PROGRESS
                 &health=AT_RISK&priority=P0
                 &ownerId=xxx&projectTypeId=xxx
                 &dueFrom=2026-09-01&dueTo=2026-09-30
                 &q=采购
                 &view=active          # active | archive | all
```

- `pageSize`：20（默认）/ 50 / 100
- `sort`：白名单字段 `updatedAt | dueDate | createdAt | priority | projectCode | lastUpdateAt`，方向 `asc | desc`
- `q`：关键词（项目编号 / 名称 / 系统名 / 描述）
- **所有过滤均在服务端叠加 Scope**，用户传参不能扩大可见范围

### 1.4 幂等与并发

- `PATCH` 支持乐观锁：请求体带 `expectedUpdatedAt`，不匹配返回 409
- 写操作关键路径（合并/迁移/归档/分支）包裹事务

---

## 2. 端点清单

### 2.1 系统

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/health` | 公开 | `{ app, database, ai }` 状态 |
| POST | `/api/auth/login` | 公开 | 限流 5/15min/IP |
| POST | `/api/auth/logout` | 登录 | |
| GET | `/api/auth/me` | 登录 | 当前用户 + 权限列表 + 部门 |

### 2.2 项目

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/projects` | 登录 | 列表（Scope 过滤） |
| POST | `/api/projects` | 登录 | 创建（编号服务端生成） |
| GET | `/api/projects/:id` | Scope | 详情（字段按角色裁剪） |
| PATCH | `/api/projects/:id` | Scope + 写权限 | 更新（关键字段需 ADMIN/MASTER） |
| DELETE | `/api/projects/:id` | ADMIN/MASTER | 软删除 → 回收站 |
| GET | `/api/projects/:id/lineage` | Scope | 祖先 + 后代 |
| GET | `/api/projects/:id/history` | ADMIN/MASTER | 字段变更历史 |
| GET | `/api/projects/:id/timeline` | Scope | 时间线事件 |
| GET | `/api/projects/stats` | 登录 | Dashboard 统计（按角色） |

### 2.3 项目更新（Updates）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/projects/:id/updates` | Scope | 分页 |
| POST | `/api/projects/:id/updates` | Scope + 写权限 | 新增（进度/状态/健康快照） |

### 2.4 生命周期操作

| 方法 | 路径 | 权限 | 事务 | 说明 |
|---|---|---|:---:|---|
| POST | `/api/projects/:id/accept` | ADMIN/MASTER | ✓ | 验收 |
| POST | `/api/projects/:id/archive` | ADMIN/MASTER | ✓ | 归档 |
| POST | `/api/projects/:id/unarchive` | ADMIN/MASTER | ✓ | 取消归档 |
| POST | `/api/projects/:id/branch` | ADMIN/MASTER（USER 按权限） | ✓ | 创建分支项目 |
| POST | `/api/projects/:id/merge` | ADMIN/MASTER | ✓ | 合并入目标项目 |
| POST | `/api/projects/:id/migrate` | ADMIN/MASTER | ✓ | 部门迁移 |
| POST | `/api/projects/:id/restore` | ADMIN/MASTER | ✓ | 从回收站恢复 |

### 2.5 部署

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/projects/:id/deployments` | **ADMIN/MASTER** | USER → 404 |
| POST | `/api/projects/:id/deployments` | ADMIN/MASTER | 新增环境 |
| PATCH | `/api/deployments/:id` | ADMIN/MASTER | 修改 |
| DELETE | `/api/deployments/:id` | ADMIN/MASTER | 删除 |
| POST | `/api/deployments/:id/verify` | ADMIN/MASTER | 更新 `lastVerifiedAt` |

### 2.6 文档与附件

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/projects/:id/documents` | Scope | 按类型/版本过滤 |
| POST | `/api/projects/:id/documents` | Scope + 写权限 | 上传（multipart） |
| PATCH | `/api/documents/:id` | ADMIN/MASTER / owner | 改标题/版本/是否内部 |
| DELETE | `/api/documents/:id` | ADMIN/MASTER / 上传人 | 软删除 |
| GET | `/api/documents/:id/download` | Scope | **服务端鉴权后流式返回** |
| POST | `/api/documents/:id/new-version` | Scope + 写权限 | 上传新版本 |

### 2.7 版本

| 方法 | 路径 | 权限 |
|---|---|---|
| GET | `/api/projects/:id/versions` | Scope |
| POST | `/api/projects/:id/versions` | ADMIN/MASTER |
| PATCH | `/api/versions/:id` | ADMIN/MASTER |
| DELETE | `/api/versions/:id` | ADMIN/MASTER |

### 2.8 分享

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/projects/:id/share` | ADMIN/MASTER | 生成 Token |
| GET | `/api/projects/:id/share` | ADMIN/MASTER | 查看状态/历史 |
| DELETE | `/api/projects/:id/share/:tokenId` | ADMIN/MASTER | 撤销 |
| POST | `/api/projects/:id/share/rotate` | ADMIN/MASTER | 重新生成（旧 Token 立即失效） |
| GET | `/api/share/:token` | **公开** | 分享页数据（**白名单字段**） |

### 2.9 搜索

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/search?q=&types=` | 登录 | 全局搜索，结果按 Scope 过滤 |

返回：`{ projects: [], documents: [], updates: [], deployments: [] }`
> USER 的 `deployments` 结果恒为空数组。

### 2.10 管理（ADMIN）

| 方法 | 路径 |
|---|---|
| GET/POST | `/api/users` |
| PATCH/DELETE | `/api/users/:id` |
| POST | `/api/users/:id/reset-password` |
| GET/POST | `/api/departments` |
| PATCH/DELETE | `/api/departments/:id` |
| GET/POST | `/api/project-types` |
| PATCH/DELETE | `/api/project-types/:id` |
| GET | `/api/audit-logs` |
| GET | `/api/recycle-bin` |
| POST | `/api/recycle-bin/:id/restore` |
| DELETE | `/api/recycle-bin/:id` |

### 2.11 设置与 AI

| 方法 | 路径 | 权限 |
|---|---|---|
| GET/PATCH | `/api/settings/ai` | ADMIN |
| POST | `/api/settings/ai/test` | ADMIN |
| POST | `/api/ai/chat` | 登录（结果按 Scope 过滤） |
| GET | `/api/ai/conversations` | 登录（仅本人） |
| GET | `/api/ai/conversations/:id` | 登录（仅本人） |
| DELETE | `/api/ai/conversations/:id` | 登录（仅本人） |
| POST | `/api/ai/summarize` | Scope |
| POST | `/api/projects/:id/ai-sync` | ADMIN（知识同步，P3） |

---

## 3. 关键请求/响应示例

### 3.1 创建项目

```http
POST /api/projects
Content-Type: application/json

{
  "name": "采购审批优化",
  "shortName": "采购审批",
  "systemName": "Purchase Approval",
  "departmentId": "uuid",
  "projectTypeId": "uuid",
  "ownerId": "uuid",
  "priority": "P1",
  "startDate": "2026-08-01",
  "dueDate": "2026-09-01",
  "objective": "缩短采购审批周期",
  "requirement": "## 背景\n当前审批需 5 天...",
  "acceptanceCriteria": [
    { "text": "功能完成", "done": false },
    { "text": "测试通过", "done": false }
  ]
}
```

```json
{
  "data": {
    "id": "uuid",
    "projectCode": "PRJ-2026-0003",
    "name": "采购审批优化",
    "status": "DRAFT",
    "healthStatus": "NORMAL",
    "progress": 0,
    "archiveCompleteness": 12,
    "createdAt": "2026-08-01T02:00:00.000Z"
  }
}
```

### 3.2 项目详情（字段裁剪）

ADMIN/MASTER 返回完整；USER 返回中**不包含**：
`deployments` · `specialNotes` · `maintenanceNotes` · `handoverInfo` · 内部文档 · `history`

```json
{
  "data": {
    "projectCode": "PRJ-2026-0003",
    "name": "采购审批优化",
    "systemName": "Purchase Approval",
    "status": "IN_PROGRESS",
    "healthStatus": "DELAYED",
    "progress": 80,
    "derived": {
      "isOverdue": true,
      "overdueDays": 5,
      "isDueSoon": false,
      "isStale": true,
      "staleDays": 11
    },
    "department": { "id": "uuid", "name": "采购部" },
    "owner": { "id": "uuid", "displayName": "张三" },
    "dueDate": "2026-09-01",
    "lastUpdateAt": "2026-08-25T10:00:00.000Z",
    "permissions": {
      "canEdit": true,
      "canArchive": false,
      "canViewDeployment": false,
      "canManageShare": false
    }
  }
}
```

> `permissions` 由服务端下发，**前端只做展示控制，不做安全判定**。

### 3.3 项目合并

```http
POST /api/projects/:id/merge

{
  "targetProjectId": "uuid",   // 合并到的主项目 C
  "sourceProjectIds": ["uuid-a", "uuid-b"],
  "reason": "需求重复，合并为统一采购平台"
}
```

服务端事务内：
1. 校验 A/B 非终态、C 存在且合法
2. 写入 `project_merges`（同 `mergeBatchId`）
3. A/B 状态 → `MERGED`（**不物理删除**）
4. A/B 写入 `project_relations`（`MERGED` → C）
5. A/B/C 各写一条 Timeline 事件
6. 写审计日志

### 3.4 部门迁移

```http
POST /api/projects/:id/migrate

{ "toDepartmentId": "uuid", "reason": "组织架构调整，仓储并入运营" }
```

事务内：
1. 写 `project_migrations`（from / to / 操作人 / 原因）
2. 更新 `projects.departmentId`
3. Timeline 事件 `DEPARTMENT_MIGRATED`
4. 审计日志
5. **权限即时生效**：新部门 USER 获得只读/写权限，原部门 USER 立即失去访问

### 3.5 AI 对话

```http
POST /api/ai/chat

{
  "conversationId": "uuid",      // 可选，不传则新建
  "projectId": "uuid",           // 可选，项目上下文
  "message": "这个系统部署在哪里？"
}
```

```json
{
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid",
    "answer": "采购管理系统（PRJ-2024-0007）部署在 Production 环境：服务器 192.168.1.246，端口 8080，版本 v2.3，状态运行中。",
    "sources": [
      {
        "type": "PROJECT",
        "projectCode": "PRJ-2024-0007",
        "title": "采购管理系统",
        "url": "/projects/uuid"
      },
      {
        "type": "DOCUMENT",
        "projectCode": "PRJ-2024-0007",
        "title": "部署说明 v2.1",
        "url": "/documents/uuid"
      }
    ],
    "provider": "fastgpt",
    "createdAt": "2026-09-06T07:00:00.000Z"
  }
}
```

> `sources` 中的每一项，均已在生成前通过 Scope 校验。
> **用户点开 source 时，页面再次走一次鉴权**，保证「AI 看得到 = 用户点得开」。

---

## 4. 错误码表

| code | HTTP | 场景 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | zod 校验失败 |
| `UNAUTHORIZED` | 401 | 未登录 |
| `INVALID_CREDENTIALS` | 401 | 账号或密码错误 |
| `FORBIDDEN` | 403 | 角色不足（菜单/管理端点） |
| `PROJECT_NOT_FOUND` | 404 | 不存在 **或** 越权 |
| `DOCUMENT_NOT_FOUND` | 404 | 同上 |
| `DEPLOYMENT_NOT_FOUND` | 404 | 同上（含 USER 访问本部门部署） |
| `INVALID_STATUS_TRANSITION` | 409 | 状态机非法迁移 |
| `DUPLICATE_CODE` | 409 | 编号冲突（理论不发生） |
| `ARCHIVE_INCOMPLETE` | 422 | 完整度 < 60% 且未确认 |
| `CREDENTIAL_FORBIDDEN` | 422 | 检测到疑似凭证内容 |
| `FILE_TOO_LARGE` | 422 | 超过上限 |
| `FILE_TYPE_NOT_ALLOWED` | 422 | 类型不允许 |
| `AI_DISABLED` | 503 | AI 关闭 |
| `AI_UPSTREAM_ERROR` | 502 | FastGPT 不可用 |
| `RATE_LIMITED` | 429 | 限流 |

---

## 5. 限流

| 端点 | 规则 |
|---|---|
| `POST /api/auth/login` | 5 次 / 15 分钟 / IP + 用户名 |
| `POST /api/ai/chat` | 30 次 / 小时 / 用户 |
| `POST /api/projects` | 60 次 / 分钟 / 用户 |
| 文档上传 | 20 次 / 分钟 / 用户 |

> 实现：进程内内存计数器（单机足够）。**不引入 Redis。**

---

## 6. API 实现约束

1. **每个 Route Handler 首行** `const actor = await requireActor()`
2. **入参一律 zod 校验**，禁止直接解构 `request.json()`
3. **业务规则零下沉到组件**：组件只调 API
4. **越权统一 404**
5. **写操作一律记审计**
6. **响应字段裁剪在序列化层**，不在前端
7. 所有 list 接口强制分页，`pageSize` 上限 100
