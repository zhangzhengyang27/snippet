<script setup lang="ts">
/**
 * 关于与帮助页（静态页，路由 /about）。
 * 内容与 README 保持一致：项目介绍、键盘流、技术栈与沙箱安全说明。
 */
import PageHeader from '@/components/layout/PageHeader.vue'
import AppIcon from '@/components/common/AppIcon.vue'

/** 键盘流快捷键说明（与 README「新手引导」一节对齐） */
const shortcuts = [
  { keys: ['j', 'k'], description: '列表页上下移动高亮项' },
  { keys: ['Enter'], description: '打开当前高亮的片段 / 示例' },
  { keys: ['/'], description: '聚焦顶部搜索框' },
  { keys: ['f'], description: '收藏当前片段' },
]

/** 技术栈速览（与 README「技术栈」一节对齐） */
const techStack = [
  { icon: 'ms:code', name: 'Vue 3 + TypeScript', detail: '组合式 API + 严格类型约束' },
  { icon: 'ms:bolt', name: 'Vite + Tailwind CSS', detail: '极速冷启动与原子化样式' },
  { icon: 'ms:account_tree', name: 'vue-router + Pinia', detail: '路由与全局状态管理' },
  { icon: 'ms:edit_note', name: 'Monaco Editor', detail: '片段编辑与 Diff 视图' },
  { icon: 'ms:lightbulb', name: 'Shiki', detail: '高质量代码高亮' },
  { icon: 'ms:dns', name: 'NestJS + PostgreSQL', detail: '配套后端与数据持久化' },
]

/** 沙箱安全要点（与 README「安全说明」一节对齐） */
const securityNotes = [
  {
    title: '沙箱与父窗口完全隔离',
    detail:
      '预览 iframe 的 sandbox 属性永不携带 allow-same-origin，运行在 opaque origin 上，杜绝沙箱逃逸。',
  },
  {
    title: '严格 CSP 注入',
    detail:
      "srcdoc 注入 CSP meta，禁止外部网络连接（connect-src 'none'）与表单外跳，内联脚本仅限白名单执行。",
  },
  {
    title: '同源资源白名单代理',
    detail: '白名单前缀内的同源资源经父窗口 postMessage 代理加载，其余外部请求一律拦截。',
  },
]
</script>

<template>
  <div class="about">
    <PageHeader
      title="关于与帮助"
      description="snippet 是面向团队/个人的「知识片段管理 + 在线示例沙箱」一体化 Web 工具。"
    />

    <!-- ============================== 项目介绍 ============================== -->
    <section class="about-card" aria-labelledby="about-intro">
      <h2 id="about-intro" class="about-card__title">
        <AppIcon icon="ms:info" :size="18" />
        项目介绍
      </h2>
      <p class="about-card__text">
        snippet 把「碎片化的代码知识」与「可运行的在线示例」放进同一个工作台：
        左侧集合树支持拖拽与嵌套分组管理片段，标签用于横向筛选；每次保存片段自动生成版本快照，
        在片段详情中可查看历史、对比 Diff 并一键回滚。
      </p>
      <p class="about-card__text">
        示例库提供可交互的 HTML/CSS/JS 在线沙箱：选中示例后可在桌面 / 平板 /
        手机三档设备下实时预览， 源码面板基于 Monaco
        编辑器，支持把示例一键导入为自己的代码片段继续加工。
      </p>
    </section>

    <!-- ============================== 快捷键说明 ============================== -->
    <section class="about-card" aria-labelledby="about-shortcuts">
      <h2 id="about-shortcuts" class="about-card__title">
        <AppIcon icon="ms:keyboard" :size="18" />
        快捷键说明
      </h2>
      <p class="about-card__text about-card__text--muted">在列表页可直接使用以下键盘流：</p>
      <ul class="shortcut-list">
        <li v-for="item in shortcuts" :key="item.keys.join()" class="shortcut-list__item">
          <span class="shortcut-list__keys">
            <kbd v-for="key in item.keys" :key="key" class="shortcut-kbd">{{ key }}</kbd>
          </span>
          <span class="shortcut-list__desc">{{ item.description }}</span>
        </li>
      </ul>
    </section>

    <!-- ============================== 技术栈说明 ============================== -->
    <section class="about-card" aria-labelledby="about-tech">
      <h2 id="about-tech" class="about-card__title">
        <AppIcon icon="ms:layers" :size="18" />
        技术栈说明
      </h2>
      <div class="tech-grid">
        <div v-for="item in techStack" :key="item.name" class="tech-item">
          <AppIcon :icon="item.icon" :size="18" class="tech-item__icon" />
          <div class="tech-item__body">
            <span class="tech-item__name">{{ item.name }}</span>
            <span class="tech-item__detail">{{ item.detail }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================== 安全说明 ============================== -->
    <section class="about-card" aria-labelledby="about-security">
      <h2 id="about-security" class="about-card__title">
        <AppIcon icon="ms:security" :size="18" />
        安全说明
      </h2>
      <p class="about-card__text about-card__text--muted">
        示例预览运行在浏览器本地沙箱中，以下机制保证示例代码无法越界：
      </p>
      <ul class="security-list">
        <li v-for="note in securityNotes" :key="note.title" class="security-list__item">
          <AppIcon icon="ms:verified_user" :size="16" class="security-list__icon" />
          <div class="security-list__body">
            <span class="security-list__title">{{ note.title }}</span>
            <span class="security-list__detail">{{ note.detail }}</span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 860px;
  margin: 0 auto;
  padding: var(--space-6) var(--page-padding-x, 22px) var(--space-12);
}

/* ── 内容卡片：与 PageHeader 同族的玻璃拟态卡片 ── */
.about-card {
  padding: 20px 22px;
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-rgb) / 0.9);
  box-shadow:
    rgb(var(--color-shadow-rgb) / 0.08) 0px 0px 0px 1px,
    0 20px 60px rgb(var(--color-shadow-rgb) / 0.06);
  margin-bottom: 20px;
}

.about-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(var(--color-primary-rgb));
}

.about-card__text {
  margin: 0 0 10px;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: rgb(var(--color-text-rgb));
}

.about-card__text:last-child {
  margin-bottom: 0;
}

.about-card__text--muted {
  color: rgb(var(--color-text-secondary-rgb) / 0.85);
}

/* ── 快捷键列表 ── */
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shortcut-list__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-variant-rgb) / 0.6);
}

.shortcut-list__keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 86px;
}

.shortcut-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 2px 7px;
  border: 1px solid rgb(var(--color-border-rgb));
  border-bottom-width: 2px;
  border-radius: 6px;
  background: rgb(var(--color-bg-elevated-rgb));
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.shortcut-list__desc {
  font-size: 0.875rem;
  color: rgb(var(--color-text-secondary-rgb));
}

/* ── 技术栈网格 ── */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}

.tech-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-variant-rgb) / 0.5);
}

.tech-item__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: rgb(var(--color-primary-rgb));
}

.tech-item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tech-item__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.tech-item__detail {
  font-size: 0.78125rem;
  line-height: 1.5;
  color: rgb(var(--color-text-secondary-rgb));
}

/* ── 安全说明列表 ── */
.security-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.security-list__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-variant-rgb) / 0.5);
}

.security-list__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: rgb(var(--color-success-rgb, var(--color-primary-rgb)));
}

.security-list__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.security-list__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.security-list__detail {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(var(--color-text-secondary-rgb));
}

@media (max-width: 640px) {
  .about {
    padding: 16px 18px 32px;
  }

  .about-card {
    padding: 16px 18px;
    border-radius: 18px;
  }
}
</style>
