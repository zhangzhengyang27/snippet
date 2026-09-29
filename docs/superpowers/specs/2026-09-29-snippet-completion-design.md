# Snippet 项目完成计划 — 设计文档

日期：2026-09-29 ｜ 状态：已获用户批准（三阶段全量推进 + 后端瘦身 + 自带账号体系 + 真实数据种子）

## 背景与目标

snippet（知识片段与可运行示例平台，Vue 3 + NestJS + PostgreSQL）源码已于 2026-09-29 从本机缓存恢复
（见 `nas-projects/snippet/_RESTORE-REPORT.md`）。用户确认后续以产品经理/项目经理/UI 设计师视角
**按顺序完成三阶段：端到端跑通 → UI/UX 打磨 → NAS 上线**。

关键事实（影响方案）：

- 原目录 `/Users/xiaoye/Desktop/html5-examples/server` **仍然存在**（用户指出），含 package.json、
  data-source.ts、tsconfig、.env、数据导入脚本、3 个 knowledge 实体——但其 `app.module.ts` 引用了
  约 30 个不存在的实体/模块（知识库平台时代遗留），原样无法编译。
- 合并三处来源（原 server ∪ 恢复的 snippet-server ∪ workbuddy 重建）后，服务端仍缺：
  12 个实体、10 个 module、约 10 个 service、分页工具。
- 前端 `LoginPage` 只调用 `login` + `checkMe`；后端 auth 仅 login/logout/me + createDefaultAdmin。
- 前端引用的后端域：`/api/knowledge/snippets`（核心，service+controller+dto 完整）、
  `/api/examples`（controller 完整，service 缺）、`/api/favorites`（controller+service 完整）、
  `/api/auth`。其余域（drive/图表/画布/UI 模板/网盘/通知）**snippet 前端零调用**。

## 范围决策（YAGNI）

| 决策 | 内容 |
|---|---|
| 后端裁剪 | 重写 app.module：只装配 Auth / Examples / Favorites / KnowledgeSnippets 四模块；实体只注册 7 张表；drive、知识库文档、通知等一律不引入（文件保留不删） |
| 账号体系 | 沿用后端自带 User + JWT（bcrypt），`createDefaultAdmin` 种子默认管理员；`VITE_AUTH_PORTAL_URL` 与外部主站门户概念废弃；注册/手机号/验证码不在本期（前端无入口） |
| 种子数据 | 新写幂等 seed 脚本，导入恢复时找回的真实片段数据（`html5-examples/code-snippets.json`、`snippets-frontend.json`、`snippets-shell.json`）+ 2-3 条示例 example + 默认集合树 |
| 数据库 | 本地开发用 docker compose 起 PostgreSQL 16（库 `html5_examples`），开发期 `DB_SYNC=true` 建表；生产迁移策略在 Phase 3 定 |
| 数据安全 | 原 server/.env 含真实阿里云 OSS AK/SK（已泄露在多处缓存），Phase 3 前提醒用户在阿里云控制台轮换；本地开发不需要 OSS 配置 |

## Phase 1：端到端跑通

### 后端补全（nas-projects/snippet-server）

基线 = 原 server 拷贝（基础设施/脚本）∪ 恢复文件（controller/service/dto），新增手写：

1. **实体 6 个**（字段从 service/dto/前端类型反推）：
   `auth/entities/user.entity`（username/passwordHash/displayName/role/createdAt）
   `examples/entities/example.entity`（title/description/category/categorySlug/topicSlug/tags/language/sourceFile/sourceLine/difficulty/isInteractive/html/css/js/snippets jsonb/sourceGroup/timestamps）
   `favorites/entities/favorite.entity`（userId+exampleId 联合唯一）
   `knowledge/entities/knowledge-snippet-tag.entity`（name 唯一）
   （已有：KnowledgeSnippet、SnippetCollection、KnowledgeSnippetTagLink —— 从原 server 拷入）
2. **service 2 个**：`examples.service`（findAll 多条件分页/findOne/create/update/remove，
   契约=examples.controller）；`snippet-version.service`（knowledge-snippets.service 构造器注入，
   提供版本快照记录与查询，最小实现）
3. **module 4 个**：AuthModule（现有 provider 装配 + JwtModule.register + createDefaultAdmin onModuleInit）、
   ExamplesModule、FavoritesModule、KnowledgeSnippetsModule（+ TypeOrmModule.forFeature 注册实体）
4. **工具**：`common/utils/pagination.util`（clampPage/clampPageSize，按调用处语义）
5. **app.module 重写**：四模块 + TypeOrm（7 实体）+ ConfigModule + ValidationPipe + CORS(5556) +
   ServeStatic 去掉（本地开发不需要 admin 静态托管）
6. **package.json**：沿用原 server（移除 ali-oss 依赖可留）；`start:dev` 脚本

### 数据库与种子

- `snippet-server/docker-compose.yml`：postgres:16 + 端口 5433:5432（避开本机 5432 冲突），
  数据卷持久化；`.env` 指向 5433
- `scripts/seed-snippets-from-exports.ts`：读取三份 JSON 导出 → 建「前端/常用片段」集合树 →
  逐条建 KnowledgeSnippet（public, userId=null）；幂等（按 name+collection 查重）
- 首次启动自动 createDefaultAdmin（admin / ADMIN_DEFAULT_PASSWORD）

### 联调验证（完成标准）

前端 `pnpm dev`（5556，proxy /api→3000）+ 后端 `pnpm start:dev`：

- [ ] 登录页用 admin 登录成功，AppHeader 显示用户态
- [ ] 代码块页：集合树加载、片段列表、详情抽屉、新建/编辑/删除、拖拽归组
- [ ] 搜索（顶部 + ⌘K 命令面板）、语言过滤、收藏、标签
- [ ] 概览/最近/收藏页显示真实统计与列表
- [ ] 示例库列表与详情打开（examples 种子数据）
- [ ] 导出 JSON/Markdown、导入回灌
- [ ] 全程无控制台报错；`vitest` 保持 36+ 通过；`vue-tsc` 0 错

## Phase 2：UI/UX 打磨

1. **IA 瘦身**：AppHeader 导航收敛为 概览/代码块/示例库/收藏夹/最近/关于；删除死链
   （主题导航 store.topics、静态网站入口）与 exampleStore 死代码
2. **真实数据走查**：空态/加载态/错误态统一走 EmptyState；文案口径一致
3. **暗色模式全页面走查**（含重建页面与详情抽屉/弹窗/命令面板）
4. **移动端走查**（列表页已有响应式；检查概览/收藏/示例/详情抽屉 Bottom Sheet）
5. **视觉统一**：重建页面（Dashboard/Favorites/Recent/About/ExampleLibrary）的间距、圆角、
   token 用法对齐幸存页面（KnowledgeSnippetsPage 为标杆）；发现组件实现与原版行为差异时修齐
6. 完成标准：三态齐全、暗色无违和、375px 宽无横向滚动、两套页面风格无割裂感

## Phase 3：NAS 上线

1. **容器化**：多阶段 Dockerfile（前端 build → 后端 nest build → 运行时 ServeStatic 托管前端 dist
   + /api），docker-compose（app + postgres，数据卷）；生产 `DB_SYNC=false` + 启动前 migration
   （或首版 synchronize 后立即关）——按避雷手册精神：不裸奔 root/弱口令，密码走 .env
2. **NAS 部署**：`/volume1/docker/snippet/`（compose + .env + 数据卷）；端口在 NAS(netstat)+
   VPS(ss) 双侧实测后选定（候选 4700）
3. **公网链路**：frpc 新代理 snippet-web → VPS remotePort；VPS nginx 站点
   `snippet.zhangzhengyang.com` + certbot HTTPS；安全组放行
4. **数据**：NAS dev-stack PostgreSQL 建独立库 `snippet`（复用现网实例，不新起容器）或 compose
   内置 PG——部署时按 NAS 现状二选一
5. 完成标准：公网 HTTPS 可访问、登录可用、数据持久化、重启自恢复（restart: unless-stopped）

## 风险与备注

- 服务端 entity 字段系反推：以「前端类型 + service 用法」双源校对；联调期发现不一致以前端契约为准修后端
- `xiaoye-ui` 的 pnpm patch 丢失：本地用 npm + vite alias 打桩方案已验证可构建；Phase 3 容器内沿用同方案
- 原 .env 的 OSS 密钥视同泄露，Phase 3 前轮换
- 三份 JSON 导出若字段与现版实体有出入，seed 脚本做容错映射

## 里程碑

- M1（Phase 1 完成）：本地全链路可用 + 种子数据真实 —— 预计一次会话内完成
- M2（Phase 2 完成）：UI 走查清单全绿
- M3（Phase 3 完成）：snippet.zhangzhengyang.com 上线
