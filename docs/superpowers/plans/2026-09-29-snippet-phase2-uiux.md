# Snippet Phase 2（UI/UX 打磨）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans（内联执行）。步骤用 `- [ ]` 跟踪。

**Goal:** 信息架构瘦身 + 视觉/体验走查修复，让 snippet 成为一个风格统一、暗色与移动端可用的完整产品。

**Architecture:** 纯前端仓库改动（/Users/xiaoye/Desktop/20260810/nas-projects/snippet），不触后端契约；以幸存页面（KnowledgeSnippetsPage/AppHeader 现状）为风格基线，浏览器实测驱动修复。

**Tech Stack:** Vue3 + vue-router + Pinia + scoped CSS（设计 token `rgb(var(--color-*-rgb))`）。

**Spec:** docs/superpowers/specs/2026-09-29-snippet-completion-design.md §Phase 2

## Global Constraints

- 不改后端；不删幸存页面既有功能
- 设计 token 一律 `rgb(var(--color-*-rgb))`，暗色自动生效（token 随主题切换）
- 完成标准：顶栏只保留 snippet 自身 IA；375px 宽无横向滚动；暗色无违和；vue-tsc/vitest/build 保持全绿

## Tasks

### Task 1: 顶栏 IA 瘦身 + 品牌名（src/components/layout/AppHeader.vue）

- [ ] 导航收敛为：概览(/)、代码块(/snippets)、示例库(/example)、收藏夹(/favorites)、最近(/recent)、关于(/about)；删除：主题广场、静态网站、低代码、UI 组件、视觉演示、Canvas、可视化/工具下拉、部署按钮
- [ ] 删除 topicLinks 及 EXAMPLES_HUB_TOPIC_SLUGS 死代码（store.topics 恒空）
- [ ] 品牌名 DevCanvas → Snippet（图标 ◆ 保留）
- [ ] 删除 src/stores/exampleStore.ts 及其引用（AppHeader 唯一消费者）
- [ ] 验证：vue-tsc 0 错；浏览器截图顶栏单行无换行

### Task 2: 示例库消费 search 参数（ExampleLibraryPage.vue，终审 M1）

- [ ] onMounted 初始化 `keyword.value = String(route.query.search ?? '')`，保留现有加载流
- [ ] 验证：从示例详情点来源分组跳回列表，搜索框带入关键词

### Task 3: authStore 旧 token 链路清理（stores/authStore.ts，终审 declined#4）

- [ ] 移除 localStorage 旧 accessToken/getMe(404)/refreshTokens(404) 恢复路径；会话唯一来源 = httpOnly cookie + checkMe()
- [ ] api/auth.ts 保留 getMe/refreshTokens 导出（避免牵连），仅 authStore 不再调用；文件头注释说明
- [ ] 验证：登录后刷新页面保持登录态；登出后回到登录页

### Task 4: 浏览器走查（暗色 / 375px / 三态）

- [ ] 暗色切换截图：概览、代码块、示例库、收藏、关于
- [ ] 375x812 视口：五页无横向滚动（document.scrollWidth <= innerWidth）
- [ ] 发现的问题当场修（样式层）

### Task 5: 质量门 + 提交

- [ ] vue-tsc / vitest / vite build 全绿
- [ ] git commit
