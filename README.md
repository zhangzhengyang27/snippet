# snippet · 知识片段与可运行示例平台

面向团队/个人的「知识片段管理 + 在线示例沙箱」Web 工具：代码片段收藏、集合树、标签、
搜索（⌘K 命令面板）、Monaco 编辑、导出/导入回灌，以及 392+ 可在线预览编辑的示例。

> 项目历史：源码曾于 2026-09 目录事故中丢失，后从本机开发工具缓存完整恢复
> （详见 `_RESTORE-REPORT.md`），数据库沿用本机 PostgreSQL 中的存量真实数据。
> UI 组件库于同日从自研 xiaoye-ui 迁移至 Element Plus。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite 8（rolldown）+ vue-router + Pinia |
| UI 组件 | **Element Plus**（中文 locale + 暗色 css-vars）+ Tailwind CSS v4 + @iconify/vue |
| 编辑器/高亮 | Monaco Editor（@guolao/vue-monaco-editor）、Shiki |
| 沙箱预览 | iframe `srcdoc` + 严格 `sandbox` 隔离 + `postMessage` 资源代理 |
| 后端 | NestJS + TypeORM + PostgreSQL（独立仓库 `../snippet-server`） |

## 快速开始

```bash
# 后端（snippet-server，默认 :3000）
cd ../snippet-server
npm install --legacy-peer-deps
cp .env.example .env            # 本机 PG：localhost:5432 / html5_examples
npm run start:dev               # 首次启动自动创建 admin 账号

# 前端（:5556，/api 代理到 :3000）
npm install --legacy-peer-deps
npm run dev
```

登录：`admin / admin123`（`ADMIN_DEFAULT_PASSWORD` 可覆盖；会话为 httpOnly cookie）。

## 常用脚本（前端）

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器（5556） |
| `npm run build` | 生产构建（vue-tsc + vite） |
| `npm run typecheck` | 类型检查 |
| `npm test` | Vitest 单测（36 例） |
| `npm run lint` | ESLint |

## 架构速览

```
snippet/          前端
├─ src/api/             REST 封装（client 统一错误/重试/401 处理）
├─ src/components/
│  ├─ common/           AppButton·AppInput·AppSelect·AppModal（全部基于 Element Plus）
│  ├─ common/code/      Monaco 编辑器封装（主题跟随应用）
│  ├─ snippets/         片段工作台（集合树/列表/详情/编辑对话框）
│  └─ layout/           AppHeader·PageHeader·Pagination·EmptyState
├─ src/composables/     列表状态/搜索/收藏/快捷键等无头逻辑
└─ src/views/           概览/代码块/示例库/收藏夹/最近/关于
snippet-server/   后端（裁剪装配版：Auth·Examples·Favorites·KnowledgeSnippets 四模块）
```

## 安全说明

- 沙箱预览永不携带 `allow-same-origin`；注入 CSP，同源资源经 `postMessage` 代理
- 全局 JWT 守卫为宽容模式：匿名可读公共数据；写接口叠加 `RequireAuthGuard`
- 片段默认私有（userId 归属），公共片段仅 `userId=NULL` 的运营数据
