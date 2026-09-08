# 06 · FastGPT 集成方案

> **前提**：FastGPT 已独立部署于 `192.168.1.246:3000`（实测 HTTP 200）。
> **不重新部署 · 不放入本仓库 · 不修改 · 不 iframe · 只通过 API 调用。**

---

## 1. 已核实的 FastGPT 真实 API 规格

来源：FastGPT 官方文档 · 对话接口（https://doc.fastgpt.cn/docs/openapi/chat/）

| 项 | 值 |
|---|---|
| 端点 | `POST {BASE_URL}/v1/chat/completions` |
| BASE_URL | `http://192.168.1.246:3000/api` |
| 鉴权 | `Authorization: Bearer <apiKey>` |
| Content-Type | `application/json` |

**请求体（已核实字段）**

```json
{
  "appId": "your_app_id",
  "chatId": "my_chatId",
  "stream": false,
  "detail": false,
  "responseChatItemId": "my_responseChatItemId",
  "variables": { "uid": "xxx", "name": "张三" },
  "messages": [{ "role": "user", "content": "导演是谁" }]
}
```

**官方文档明确的关键约束（必须遵守）**

| 约束 | 影响 |
|---|---|
| `appId` 优先级：`body.appId` > `apikey-appId` 兼容格式 > apikey 关联 appId（旧版） | **我们采用 body 传 `appId`** |
| `model` / `temperature` 等参数**无效**，由应用编排决定 | IPM **不传** model，避免误导 |
| 不返回实际 token 消耗；需 `detail=true` 后从 `responseData` 自行计算 | 我们设 `detail=true` 记录用量 |
| SDK 可能需要 `/v1` 前缀，404 时补充重试 | 客户端内置 base URL 兼容重试 |
| API Key 是**成员凭证**（团队内成员共享），非应用级密钥 | ⚠️ **见第 2 节重大风险** |

---

## 2. ⚠️ 重大安全发现与架构决策（ADR-08）

### 2.1 问题

FastGPT 的 API Key 是**「当前登录成员的开放接口调用凭证」**，不是应用专属密钥。这意味着：

1. IPM 用同一个 Key 代表**同一个 FastGPT 成员身份**调用
2. 若把项目数据同步进 FastGPT **知识库**，该知识库归属于那个成员的账号体系
3. 公司共享的 FastGPT 实例上，**其他应用/其他成员可能检索到这些知识库内容**
4. 一旦同步，权限就不再由 IPM 控制——**FastGPT 自己决定谁能检索到什么**

这直接违反需求第九十七条的铁律：

> **绝对禁止 FastGPT 自己决定用户权限。**

### 2.2 决策：第一版采用 **Context Injection**，不做知识库同步

```
┌── 方案 A：知识库同步（需求原文 111 条）──────────────┐
│  IPM ──同步──> FastGPT 知识库 ──检索──> 回答           │
│  ✗ 数据长期驻留共享实例                                │
│  ✗ 检索阶段不由 IPM 控制权限 → 越权泄露风险             │
│  ✗ 同步滞后导致答案过期                                │
│  ✗ 需额外维护同步任务/失败重试/增量                     │
└──────────────────────────────────────────────────┘

┌── 方案 B：Context Injection（★ 推荐，第一版采用）──────┐
│  IPM 检索（权限过滤后）→ 组装 Context → 单次注入 → 回答  │
│  ✓ 权限 100% 由 IPM 的 Authorization Service 控制       │
│  ✓ FastGPT 侧零持久数据（用完即弃）                     │
│  ✓ 数据永远实时，无同步滞后                             │
│  ✓ 无同步任务、无失败重试、无增量逻辑                    │
│  ✓ FastGPT 故障 → 仅 AI 不可用，主功能不受影响           │
│  ✗ 单次 context 长度受限（内部项目量级下完全够用）        │
└──────────────────────────────────────────────────┘
```

**推荐方案 B。** 理由：它把「权限」彻底锁死在本系统内，且在数百个项目的数据量级下，检索 + 注入的性能与质量完全够用，同时省掉一整套同步运维。

> 本条为架构建议，**需你确认**。若坚持知识库同步，前置条件见 §8。

---

## 3. 架构链路

```
┌──────────────┐
│   Frontend   │  /ai  ·  项目页「问 AI」
└──────┬───────┘
       │ POST /api/ai/chat
┌──────▼───────────────────────────────────────────────┐
│  Route Handler                                        │
│  1. requireActor()                                    │
│  2. zod 校验                                          │
└──────┬───────────────────────────────────────────────┘
┌──────▼───────────────────────────────────────────────┐
│  AI Service                                           │
│  3. buildScope(actor)          ← 复用同一权限服务 ★     │
│  4. 意图识别 + 检索（Scope 强制注入查询）               │
│  5. 组装 Context（带 [SRC-n] 引用标记）                 │
│  6. 组装 messages（含系统提示词 + 历史 + 用户问题）      │
└──────┬───────────────────────────────────────────────┘
┌──────▼───────────────────────────────────────────────┐
│  AIProvider (接口)                                    │
│   └─ FastGPTProvider（第一版唯一实现）                  │
│      POST {FASTGPT_BASE_URL}/v1/chat/completions      │
│      Authorization: Bearer ${FASTGPT_API_KEY}         │
│      body: { appId, chatId, stream, detail,           │
│              variables, messages }                    │
└──────┬───────────────────────────────────────────────┘
┌──────▼───────────────────────────────────────────────┐
│  7. 解析回答中的 [SRC-n] → 映射真实实体 → sources       │
│  8. 幻觉引用过滤（只保留注入过的 refId）★               │
│  9. 持久化 ai_messages（含 sources / 用量 / 延迟）      │
└──────────────────────────────────────────────────────┘
```

**绝不：React → FastGPT 直连。**
**绝不：FastGPT → PostgreSQL。**

---

## 4. Provider 抽象

```ts
// src/server/ai/provider.ts
export interface AiChatRequest {
  messages: AiMessage[];      // 含注入的 context（放在 system 或首条 user 前）
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AiChatResponse {
  content: string;
  raw?: unknown;
  usage?: { prompt?: number; completion?: number; total?: number };
}

export interface AiProvider {
  readonly name: string;                       // 'fastgpt'
  chat(req: AiChatRequest): Promise<AiChatResponse>;
  health(): Promise<{ ok: boolean; message?: string; latencyMs?: number }>;
}
```

第一版实现 `FastGPTProvider`。未来 `AgnesAiProvider` / `OpenAiCompatibleProvider` 只需实现同一接口，**业务层零改动**。

### 4.1 FastGPTProvider 要点

```ts
// src/server/ai/providers/fastgpt.ts
const base = env.FASTGPT_BASE_URL;             // http://192.168.1.246:3000/api

async function post(path: string, body: unknown) {
  // base URL 兼容重试：先 /v1/...，404 时重试 /...（官方文档明确场景）
}

chat: POST `${base}/v1/chat/completions`
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  body: {
    appId: env.FASTGPT_APP_ID,
    chatId: randomUUID(),        // ★ 每轮新 chatId，不在 FastGPT 侧留存会话
    stream: false,
    detail: true,                // 用于取 responseData 计算 token
    variables: { userId, role, dept },
    messages,
  }
  timeout: 30_000
```

**为什么每轮换 chatId**：FastGPT 会按 `chatId` 持久化会话历史。固定 chatId 会让含 IP/端口/维护说明的 context **长期留存在 FastGPT 实例中**。
改为：每轮生成新 chatId，由 IPM 自己保存完整历史并在下一轮拼接 `messages` 发送。
→ **FastGPT 侧不形成持久会话，数据资产只在本系统内。**

---

## 5. 检索与 Context 构建

### 5.1 意图识别（轻量规则，不用 LLM 判断）

| 意图 | 触发关键词 | 检索目标 |
|---|---|---|
| `DEPLOYMENT` | 部署 / 服务器 / IP / 端口 / 运行在哪 / 8080 | `projects` + `project_deployments` |
| `LINEAGE` | 后续 / 升级 / 第二期 / 分支 / 派生 / 以前做过 | `project_relations` + 父子链 |
| `MAINTENANCE` | 维护 / 注意 / 坑 / 重启 / 怎么部署 / 出问题 | `maintenanceNotes` / `specialNotes` |
| `HISTORY` | 为什么延期 / 变更 / 什么时候改的 / 谁改的 | `project_updates` + `audit_logs` |
| `VERSION` | 版本 / v2 / 升级到 | `project_versions` |
| `GENERAL` | 其余 | 全文检索 `name`/`systemName`/`objective`/`description` |

### 5.2 检索实现（IPM 侧 RAG-lite）

**不引入向量数据库。** 数据量为数百级项目，PostgreSQL 原生检索足够：

```sql
-- 关键词检索（ILIKE + pg_trgm）
SELECT id, project_code, name, system_name,
       similarity(name, $1) AS score
FROM projects
WHERE deleted_at IS NULL
  AND (name ILIKE $2 OR system_name ILIKE $2 OR project_code ILIKE $2
       OR description ILIKE $2 OR objective ILIKE $2)
ORDER BY score DESC
LIMIT 20;
```

结构化精确查询（如「哪个项目用 8080」）走 `project_deployments` 的 `(serverIp, port)` 索引，直接命中。

### 5.3 权限过滤（**检索阶段就过滤，不是事后裁剪**）

```ts
// ❌ 错误：先查后过滤
const all = await search(q);
const visible = all.filter(p => hasAccess(p));   // 已泄露到内存/日志

// ✅ 正确：Scope 注入查询条件
const where = buildProjectWhere(scope, searchFilter);
const rows = await search(where);                // 越权数据根本没被取出
```

### 5.4 Context 组装格式

```
以下是你有权限查看的内部项目资料。你只能基于这些资料回答。

[SRC-1] PRJ-2024-0007 「采购管理系统」（采购部 · 已归档）
系统名称：Purchase Management System
当前版本：v2.3 · 系统状态：运行中
部署信息（Production）：服务器 192.168.1.246，端口 8080，路径 /opt/pms，服务名 pms-web
维护说明：重启执行 systemctl restart pms-web；数据库每日 02:00 备份
特殊注意事项：升级前必须先停定时任务，否则会产生重复单据

[SRC-2] PRJ-2025-0031 「采购报表升级」（采购部 · 已归档）
父项目：PRJ-2024-0007
...

用户问题：采购管理系统部署在哪里？
```

### 5.5 系统提示词（防编造硬约束）

```
你是公司内部项目与软件资产知识助手。

严格规则：
1. 只能使用下方 CONTEXT 中的资料回答。CONTEXT 之外的内容一律不得使用。
2. 如果 CONTEXT 中没有能回答问题的信息，必须明确回答：
   「没有找到你有权限查看的相关记录。」
   禁止用常识、推测、行业惯例填补。
3. 严禁编造：服务器 IP、端口、负责人、版本、日期、项目历史。
   任何事实性数字必须能在 CONTEXT 中找到原文。
4. 回答中引用来源时，使用 [SRC-n] 标记，n 必须是 CONTEXT 中真实存在的编号。
5. 不要输出你没有在 CONTEXT 中见过的 [SRC-n] 编号。
6. 使用简体中文，简洁、直接、结构化。
7. 涉及部署/维护信息时，优先摘录原文，不要改写数字。
```

### 5.6 来源解析与幻觉过滤 ★

```ts
function extractSources(answer: string, injected: SourceRef[]): SourceRef[] {
  const ids = new Set(injected.map(s => s.refId));
  const matched = [...answer.matchAll(/\[SRC-(\d+)\]/g)]
    .map(m => `SRC-${m[1]}`)
    .filter(id => ids.has(id));        // ★ 丢弃 CONTEXT 中不存在的引用
  return dedupe(matched).map(id => injected.find(s => s.refId === id)!);
}
```

> **安全保障**：模型若 hallucinate 一个 `[SRC-9]`（未注入过），会被直接过滤掉。
> 用户看到的每一个 source，都对应一个**真实存在且已通过权限校验**的实体。

### 5.7 来源权限二次校验

生成 sources 后，对每一项再次执行 `assertProjectAccess(scope, project)`。
**保证「AI 引用得到 = 用户点得开」。**

---

## 6. 对话持久化

```ts
// 写入 ai_messages
{
  conversationId, role, content,
  sources: SourceRef[],              // 已过滤
  tokenUsage: { prompt, completion, total },
  provider: 'fastgpt',
  model: null,                       // FastGPT 不由请求决定，故留空
  latencyMs,
  createdAt
}
```

**禁止写入**：API Key · Secret · Token · 密码

历史多轮：从 `ai_messages` 取最近 N 轮（默认 6 轮）拼入 `messages`，由 IPM 维护（见 §4.1）。

---

## 7. 配置、降级与容错

### 7.1 配置来源优先级

```
环境变量（优先）  >  DB ai_settings
FASTGPT_BASE_URL  >  ai_settings.baseUrl
FASTGPT_API_KEY   >  ai_settings.apiKeyCipher（AES-256-GCM 解密）
FASTGPT_APP_ID    >  ai_settings.appId
```

- `AI_ENABLED=false` → `/ai` 显示「AI 功能未启用」，其余系统 100% 正常
- API Key **绝不返回完整值**；仅返回 `apiKeyFingerprint`（前 4 后 4 掩码）

### 7.2 容错

| 场景 | 处理 |
|---|---|
| 超时 | 30s AbortController → `AI_UPSTREAM_ERROR` |
| 连接失败 | 返回 502 + 「AI 服务暂时不可用，你可以使用搜索功能」 |
| 连续 5 次失败 | 熔断 5 分钟，快速失败（不拖慢页面） |
| 429 限流 | 30 次/小时/用户 |
| FastGPT 停机 | **项目管理 / 归档 / 部署 / 文档 / 搜索 全部正常** |

### 7.3 健康检查

```
GET /api/health
{
  "data": {
    "app": "ok",
    "database": "ok",
    "ai": { "status": "connected", "latencyMs": 420 }
  }
}
```

`ai.status`：`connected` | `failed` | `disabled` | `not_configured`

Settings → AI 页提供「测试 AI 连接」按钮，实时显示 Connected / Connection Failed + 错误信息（脱敏）。

---

## 8. 若坚持知识库同步的前置条件（供决策）

如未来确实需要 FastGPT 知识库检索能力，必须同时满足：

1. **专用 FastGPT 账号**：为 IPM 单独创建一个 FastGPT 成员，其名下**不挂载任何其他应用**
2. **专用知识库集合**：仅 IPM 使用，不与公司其他 FastGPT 应用共享
3. **同步前权限分片**：按部门拆分集合，或每条数据带 `departmentId` 元数据 + FastGPT 侧元数据过滤
4. **同步内容脱敏**：默认不同步 Deployment / 维护说明 / 特殊注意事项
5. **可撤回**：`knowledge_sources` 记录 externalId，支持一键删除远端数据
6. **明确告知**：同步即意味着数据离开本系统边界，需公司层面知情

> 即便如此，**权限主判定仍必须在 IPM 侧**，FastGPT 检索结果只能作为候选，返回前再次过 Scope。

---

## 9. 验收用例（AI 相关）

| # | 场景 | 期望 |
|---|------|------|
| A-01 | 问「采购管理系统部署在哪里」 | 答出 IP/端口，来源可点开 |
| A-02 | 问「哪个项目运行在 8080」 | 精确命中 |
| A-03 | USER 问无权限项目 | 「没有找到你有权限查看的相关项目」，**零内容泄露** |
| A-04 | USER 问「采购部有哪些系统」（无权限） | 同上 |
| A-05 | 问不存在的项目 | 「没有找到相关记录」，**不编造** |
| A-06 | 模型返回幻觉 `[SRC-9]` | 被过滤，sources 为空或仅剩有效项 |
| A-07 | 点击 source 链接 | 有权限则打开；无权限则 404 |
| A-08 | 断网 / FastGPT 停机 | AI 报错，其余功能正常 |
| A-09 | `AI_ENABLED=false` | /ai 提示未启用，系统正常 |
| A-10 | 项目页「问 AI」 | 自动带入项目上下文 |
| A-11 | 对话记录 | 保存 question/answer/sources，无 API Key |
| A-12 | Settings 显示 API Key | 仅掩码 |
