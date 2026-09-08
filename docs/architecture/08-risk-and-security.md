# 08 · 风险与安全清单

---

## 1. 风险清单

| # | 风险 | 影响 | 概率 | 缓解措施 |
|---|------|------|:---:|---------|
| R-01 | **权限实现漏洞**（某处漏判 Scope） | 高 | 中 | 单一 `authz.ts` 入口；`projectRepo` 封装 + ESLint 禁用裸 `prisma.project`；Playwright 20 条安全 E2E 作为 CI 门禁 |
| R-02 | FastGPT 为公司共享实例，数据外泄 | 高 | 中 | **Context Injection 而非知识库同步**（ADR-08）；每轮新 chatId；不持久化到 FastGPT |
| R-03 | 敏感凭证被误存进 Deployment 备注 | 高 | 中 | zod 黑名单正则拦截（password/PRIVATE KEY/token）；拦截时记审计；UI 明示禁止项 |
| R-04 | 历史项目整理工作量大，半途而废 | 高 | **高** | 允许档案不完整（57% 也可归档）；提供批量上传；完整度可视化形成正反馈 |
| R-05 | 2 人团队维护成本超预期 | 中 | 中 | 模块化单体；零中间件依赖；不引入 Redis/Kafka/ES；README 完整可交接 |
| R-06 | 需求部门不使用，退回 Excel | 中 | 中 | 分享链接降低协作门槛；USER 首页只显示本部门；创建项目表单第一屏仅 7 个字段 |
| R-07 | 端口/环境冲突（3000 被 Docker 占用） | 低 | 已发生 | 应用端口改 **3010**；DB 5432；已实测 |
| R-08 | Prisma migration 冲突 / 生产结构漂移 | 中 | 低 | 禁止 `db push`；migration 文件入库；破坏性变更走 expand-contract |
| R-09 | 文件存储与数据库不一致（孤儿文件） | 中 | 中 | 备份脚本同时打包 DB + `storage/`；删除文档保留记录（软删除） |
| R-10 | AI 编造 IP/端口 | **高** | 中 | 系统提示词硬约束 + **幻觉引用过滤** + 无记录强制回复模板 + 来源二次鉴权 |
| R-11 | FastGPT 停机影响主系统 | 低 | 中 | 熔断 + 独立健康检查 + `AI_ENABLED` 总开关；主功能零依赖 AI |
| R-12 | 时区混乱（UTC 存储 / Taipei 展示） | 中 | 中 | 日期字段用 `date`；时间戳用 `timestamptz`；统一 `date-fns-tz` 格式化 helper；禁止裸 `new Date().toLocaleString()` |
| R-13 | 人员离职导致知识断层（本项目自身） | 中 | 低 | 本套架构文档 + README 完整；ADR 记录决策理由 |
| R-14 | 上传恶意文件 | 中 | 低 | MIME + 扩展名 + magic number 三重校验；不执行上传物；不进 public 目录 |
| R-15 | 单点无备份导致数据丢失 | **高** | 低 | `backup.sh` 定时 + 异地留存；restore.sh 定期演练 |

---

## 2. 安全清单

### 2.1 认证与会话

- [ ] 密码 bcryptjs cost=12，**永不明文**
- [ ] 初始密码走环境变量 `ADMIN_INITIAL_PASSWORD` / `MASTER_INITIAL_PASSWORD`；**未设置则启动失败**（不使用弱默认密码）
- [ ] JWT httpOnly + SameSite=Lax + Secure(prod)
- [ ] 登录失败统一文案（不区分用户不存在/密码错误）
- [ ] 登录限流 5 次/15 分钟/IP
- [ ] 支持强制改密码标记
- [ ] 登出立即失效（客户端清 cookie + 服务端黑名单可选）

### 2.2 授权

- [ ] **Server-side Authorization**，前端按钮仅为体验
- [ ] 单一权限入口 `authz.ts`
- [ ] Scope 注入查询条件（**先过滤后查询**，不是先查询后过滤）
- [ ] 越权统一返回 **404**（非 403），不泄露资源存在性
- [ ] USER 默认不可见 Deployment / 维护说明 / 特殊注意事项 / 内部文档 / 历史
- [ ] 分享 Token 不提权，随机 32 字节 base64url，可撤销
- [ ] 文档下载服务端鉴权后流式返回
- [ ] AI 与项目访问**共用同一 Authorization Service**
- [ ] AI 来源二次鉴权（AI 看得到 ⇔ 用户点得开）

### 2.3 数据安全

- [ ] 环境变量管理全部密钥；`.env` 进 `.gitignore`
- [ ] `storage/` 不暴露为静态目录
- [ ] 文件 storageKey 随机化，不用原始文件名
- [ ] 上传类型白名单 + 大小上限 + magic number 校验
- [ ] **禁止存储**：服务器密码 / SSH 私钥 / 数据库密码 / API Key / Token / Secret
- [ ] 审计日志 append-only
- [ ] 日志脱敏：不记录 password / apiKey / token / secret
- [ ] SQL 注入：全程 Prisma 参数化查询，禁止 `$queryRaw` 拼接

### 2.4 传输与应用

- [ ] 生产强制 HTTPS + HSTS
- [ ] 安全响应头：`X-Content-Type-Options` · `X-Frame-Options` · `Referrer-Policy` · CSP
- [ ] CSRF：SameSite=Lax + 写操作校验 Origin
- [ ] XSS：React 默认转义 + Markdown 渲染 `rehype-sanitize` + 禁止 `dangerouslySetInnerHTML`
- [ ] 错误信息脱敏（生产统一文案 + traceId）
- [ ] 依赖漏洞扫描（`npm audit` 纳入 CI）
- [ ] 限流：登录 / AI / 创建 / 上传

### 2.5 AI 专项

- [ ] Context 仅含**已通过权限校验**的数据
- [ ] 检索阶段过滤，而非结果阶段
- [ ] 系统提示词强制「无记录即回答没有找到」
- [ ] **幻觉引用过滤**（丢弃未注入的 `[SRC-n]`）
- [ ] 不向 FastGPT 传数据库凭证
- [ ] 不保存 API Key / Secret 到对话记录
- [ ] 每轮新 chatId，不在 FastGPT 侧留存会话
- [ ] API Key 展示仅掩码

---

## 3. 备份与恢复

```bash
# 定时备份（每日 02:00）
0 2 * * * /app/scripts/backup.sh

# backup.sh 内容要点
pg_dump -Fc -f /backup/db_$(date +%Y%m%d_%H%M%S).dump
tar -czf /backup/storage_$(date +%Y%m%d_%H%M%S).tar.gz /app/storage
# 保留 30 天，异地拷贝
```

**恢复演练**：每季度执行一次 `restore.sh` 到临时库验证。

> 数据库与 storage 目录**必须同批次备份**，否则出现孤儿文件或丢失文件。

---

## 4. 上线前检查表

- [ ] `NODE_ENV=production`
- [ ] `ADMIN_INITIAL_PASSWORD` / `MASTER_INITIAL_PASSWORD` 已设置为强密码，且**首次登录后强制修改**
- [ ] `APP_SECRET`（JWT + API Key 加密）为 32 字节随机值
- [ ] `DATABASE_URL` 指向生产库，且 `?sslmode=require`（如跨机）
- [ ] `FASTGPT_BASE_URL` / `API_KEY` / `APP_ID` 已配置且「测试连接」通过
- [ ] `/api/health` 三项全绿
- [ ] 20 条安全 E2E 全通过
- [ ] 12 条 AI 用例全通过
- [ ] 备份脚本已部署并验证
- [ ] 日志中无密钥泄露（grep 扫描）
- [ ] Git 仓库无 `.env` / 密钥 / 真实公司敏感数据

---

## 5. 依赖最小化原则（降低长期风险）

| 类别 | 数量控制 |
|---|---|
| 运行时依赖 | ≤ 25 个 |
| 无消息队列 / 缓存 / 搜索引擎 | ✓ |
| 无自建 UI 组件库（shadcn 复制源码） | ✓ |
| 无图表库（自绘 SVG） | ✓ |
| 无富文本编辑器（Markdown） | ✓ |

> 依赖越少，2 人团队长期维护成本越低，交接越容易。
