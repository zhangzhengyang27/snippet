# snippet · 知识片段与可运行示例平台

> **恢复注记（2026-09-29）**：本项目在 2026-09 目录删除事故后从本机开发工具缓存完整恢复
> （快照/会话重放 + 调用点反推）。typecheck / vitest / vite build / eslint 全部通过。
> 部分文件为标注「恢复推断」的重建；.git 历史、pnpm-lock.yaml、patches/xiaoye-ui.patch 等
> 无法恢复的项与使用须知见 `_RESTORE-REPORT.md`。

面向团队/个人的「知识片段管理 + 在线示例沙箱」一体化 Web 工具，支持代码片段收藏、标签、集合、版本历史、Monaco 编辑、Shiki 高亮，以及多设备实时预览（SFC 编译）。

## 技术栈

- 前端：Vue 3 + TypeScript + Vite 8 + Tailwind CSS + vue-router + Pinia
- 编辑器/高亮：Monaco Editor、Shiki
- 沙箱预览：iframe `srcdoc` + 严格 `sandbox` 隔离 + `postMessage` 资源代理
- 后端（配套）：NestJS + TypeORM + PostgreSQL（位于 `html5-examples/server`）

## 快速开始

```bash
pnpm install
cp .env.example .env   # 按需配置 VITE_API_BASE_URL / VITE_AUTH_PORTAL_URL
pnpm dev
```

常用脚本：

| 命令                 | 说明                   |
| -------------------- | ---------------------- |
| `pnpm dev`           | 启动开发服务器         |
| `pnpm build`         | 生产构建               |
| `pnpm lint`          | ESLint 检查            |
| `pnpm typecheck`     | 类型检查               |
| `pnpm test`          | 运行单元测试（Vitest） |
| `pnpm test:coverage` | 测试覆盖率             |

## 环境变量

| 变量                   | 说明              | 默认值                        |
| ---------------------- | ----------------- | ----------------------------- |
| `VITE_API_BASE_URL`    | 后端接口前缀      | `/api`                        |
| `VITE_AUTH_PORTAL_URL` | 主站/注册门户地址 | `http://localhost:5555/login` |

## 新手引导（核心功能速览）

1. **片段管理**：左侧集合树支持拖拽与嵌套分组；标签用于横向筛选。
2. **搜索**：顶部搜索框走后端模糊检索（`useSnippetSearch`）。
3. **版本历史**：每次保存片段自动生成版本快照；在片段详情可查看历史、对比 Diff、一键回滚。
4. **在线预览**：选中示例后，右侧可在桌面/平板/手机三档设备下实时预览；沙箱严格隔离，禁止访问非白名单资源。
5. **键盘流**：列表页 `j/k` 上下移动、回车打开、`/` 聚焦搜索、`f` 收藏。

## 安全说明

- 预览沙箱**永不携带** `allow-same-origin`，与父窗口完全隔离，消除沙箱逃逸。
- 注入 CSP meta，禁止外部网络连接与表单外跳；同源资源（白名单前缀）经父窗口 `postMessage` 代理加载。
- 后端版本接口位于 `knowledge/snippets/:id/versions`（列表/详情/删除/回滚）。

## 贡献

1. 请确保 `pnpm lint && pnpm typecheck && pnpm test` 通过。
2. 提交遵循约定式提交（Conventional Commits）。
3. 后端改动请在 `html5-examples/server` 单独提交。
