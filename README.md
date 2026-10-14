# snippet · 代码片段知识库（前端）

面向团队/个人的代码片段管理与分享平台：片段增删改查、集合树、标签、⌘K 搜索、Monaco 编辑、
版本历史、收藏、导入/导出，以及「我的」与「公共库」双库浏览。代码在 iframe 沙箱中预览
（严格 `sandbox` 隔离 + 注入 CSP + `postMessage` 资源代理）。

后端是独立仓库：[zhangzhengyang27/snippet-server](https://github.com/zhangzhengyang27/snippet-server)。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 + TypeScript + Vite 8（rolldown）+ vue-router + Pinia |
| UI | Element Plus（中文 locale + 暗色 css-vars）+ Tailwind CSS v4 + @iconify/vue |
| 编辑器 | Monaco Editor（@guolao/vue-monaco-editor）、Shiki |
| 预览沙箱 | iframe `srcdoc` + 严格 `sandbox` + 注入 CSP + `postMessage` 资源代理 |
| 测试 | Vitest + @vue/test-utils |

> 首屏不依赖任何外部 CDN：字体使用系统字体栈，图标使用离线生成的
> `src/generated/iconify-offline.ts`——**新增图标后必须运行 `npm run icons:build`**，
> 否则运行时会回落到 Iconify 在线接口（`npm run icons:check` 可查漂移）。

## 快速开始

```bash
# 1. 先启动后端（snippet-server，默认 :3000）
cd ../snippet-server
npm install --legacy-peer-deps
cp .env.example .env
npm run migration:run
npm run start:dev

# 2. 再启动前端（:5556，/api 代理到 :3000）
npm install --legacy-peer-deps
npm run dev
```

首次启动后端会自动创建管理员账号，密码由环境变量 `ADMIN_DEFAULT_PASSWORD` 决定；
登录态是 httpOnly cookie。

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器（5556） |
| `npm run build` | 生产构建（vue-tsc + vite） |
| `npm run typecheck` | 类型检查 |
| `npm run test` | Vitest 单测 |
| `npm run lint` | ESLint |
| `npm run icons:build` | 重建离线图标集合 |
| `npm run icons:check` | 校验离线图标是否漂移 |

## 页面

| 路由 | 页面 |
|---|---|
| `/` | 概览（「我的 / 公共」统计卡） |
| `/snippets` | 我的片段（集合树 + 列表 + 详情，可编辑） |
| `/library` | 公共库（只读，可「复制到我的」） |
| `/snippets/:id`、`/library/:id` | 片段详情（按来源决定是否只读） |
| `/favorites` | 收藏夹 |
| `/recent` | 最近使用 |
| `/admin/review` | 发布审核台（仅管理员可见入口） |
| `/profile` | 个人中心（含安全设置） |
| `/login`、`/register` | 登录 / 注册 |
| `/about` | 关于 |

## 目录结构

```
src/
├─ api/            REST 封装（client 统一错误处理 / 401 跳转）
├─ components/
│  ├─ common/      AppButton·AppInput·AppSelect·AppModal（基于 Element Plus）
│  ├─ common/code/ Monaco 编辑器封装（主题跟随应用）
│  ├─ snippets/    片段工作台（集合树 / 列表 / 详情 / 编辑对话框）
│  └─ layout/      AppHeader·PageHeader·Pagination·EmptyState
├─ composables/    列表状态 / 搜索 / 收藏 / 快捷键等无头逻辑
├─ generated/      离线图标集合（由 npm run icons:build 生成）
├─ utils/          沙箱、元数据校验、导入导出等
└─ views/          各页面
```

## 权限与数据模型

- 片段默认私有、归属创建者；作者可提交发布审核，管理员通过后进入**公共库**。
- 🚨 公共片段的 `user_id` 指向**托管账号（非 NULL）**，由迁移 `PublicSnippetRequiresOwner`
  与 CHECK 约束 `ck_knowledge_snippets_public_has_owner` 保证。
  **判断公共片段不要用 `user_id IS NULL`。**
- `is_public` 是「公共库可见」的唯一开关；`moderation_status`（`none|pending|approved|rejected`）
  只表达审核流程状态，二者**不可互相推导**。
- **只读判据取决于从哪个列表进入**（`/library` 为只读），不能用 `isPublic` 反推——
  作者本人发布的片段 `isPublic` 同样为 true，但仍可编辑。
- 前端权限判据：`authStore.user?.role === 'admin'`。
- 列表接口默认**不返回 `content`**（列表瘦身）；需要正文时（预览 / 复制 / 编辑 / 导出）
  会按需拉取并回填缓存。

## 沙箱安全

- 预览 iframe 永不携带 `allow-same-origin`，并在文档内注入 CSP。
- 白名单内的同源资源前缀（见 `src/utils/sandbox.ts`）通过 `postMessage` 由父窗口代理加载，
  其余外链请求被 CSP 拦截。

## 协作说明

- 元数据校验（标题 / 描述）在前后端**同口径**实现，修改任意一侧必须同步另一侧：
  后端 `snippet-metadata.util.ts` ↔ 前端 `src/composables/useSnippetEditorForm.ts`。
