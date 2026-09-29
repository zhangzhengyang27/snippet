<script setup lang="ts">
/**
 * 列表项：grid 变体为卡片（块状），list 变体为紧凑横向单行（snippetslab 极简风）。
 *
 * list 变体设计原则：
 * 1. 行高 38px，整行可点击
 * 2. 主标题占左，次级信息（语言 / 时间）集中右侧
 * 3. 无表格分隔线，无复杂边框
 * 4. hover 才有轻盈背景，选中态用单一柔和背景 + 左侧细线
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useIsMobile } from '@/composables/useIsMobile'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { snippetDifficultyLabel, type SnippetDifficulty } from '@/types/code-block'
import { languageLabel, languageColor } from '@/utils/snippet-languages'

const { isCompact } = useIsMobile()

const props = defineProps<{
  snippet: KnowledgeSnippet
  selected: boolean
  variant?: 'grid' | 'list'
  checkable?: boolean
  checked?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  copy: [id: string]
  toggleCheck: [id: string]
}>()

const handleSelect = () => emit('select', props.snippet.id)
const handleCopy = (e: MouseEvent) => {
  e.stopPropagation()
  emit('copy', props.snippet.id)
}
const handleToggleCheck = (e: MouseEvent) => {
  e.stopPropagation()
  emit('toggleCheck', props.snippet.id)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleSelect()
  }
}

/** 「3 天前 / 昨天 / 2026-08-18」 */
function formatRelative(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffD = Math.floor(diffMs / 86_400_000)
  if (diffD === 0) {
    const diffH = Math.floor(diffMs / 3_600_000)
    if (diffH <= 0) return '刚刚'
    return `${diffH} 小时前`
  }
  if (diffD === 1) return '昨天'
  if (diffD < 7) return `${diffD} 天前`
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const langHex = computed(() => languageColor(props.snippet.language))

/** 移除标题末尾的「（JS）/（HTML）」语言后缀，语言信息由色点与左侧栏体现 */
const displayName = computed(() => {
  const raw = props.snippet.name
  return raw
    .replace(
      /\s*[（(](?:JS|JavaScript|TS|TypeScript|HTML|CSS|Python|Java|Shell|SQL|Vue|React)[）)]$/i,
      ''
    )
    .trim()
})

/** 难度档位（未标注返回空字符串） */
const snippetDifficulty = computed<SnippetDifficulty | ''>(
  () => props.snippet.displayAttrs?.difficulty ?? ''
)
const difficultyText = computed(() => snippetDifficultyLabel(snippetDifficulty.value))
</script>

<template>
  <article
    class="snippet-card"
    :class="{
      'is-selected': props.selected,
      'is-checked': !!props.checked,
      'has-check': props.checkable,
      'is-list': props.variant === 'list',
      'is-mobile': isCompact,
    }"
    tabindex="0"
    role="button"
    @click="handleSelect"
    @keydown="handleKeydown"
  >
    <!-- ── 条状（list）变体：两行展示（标题 + 描述），左侧色点 ── -->
    <template v-if="props.variant === 'list'">
      <label v-if="props.checkable" class="snippet-list__check" @click.stop>
        <input
          type="checkbox"
          class="snippet-list__checkbox"
          :checked="!!props.checked"
          @click="handleToggleCheck"
        />
      </label>

      <!-- 左侧：语言色点（视觉锚点） -->
      <i class="snippet-list__dot" :style="{ background: langHex }" />

      <!-- 中间：标题 + 描述（两行） -->
      <div class="snippet-list__text">
        <span class="snippet-list__title" :title="props.snippet.name">
          {{ displayName }}
        </span>
        <span
          v-if="props.snippet.description"
          class="snippet-list__desc"
          :title="props.snippet.description"
        >
          {{ props.snippet.description }}
        </span>
      </div>

      <!-- 难度徽章 -->
      <span v-if="snippetDifficulty" class="snippet-diff-badge" :class="`is-${snippetDifficulty}`">
        {{ difficultyText }}
      </span>

      <!-- 右侧：收藏 + 操作（hover/选中时浮现） -->
      <span class="snippet-list__end">
        <AppIcon
          v-if="props.snippet.favorite"
          icon="material-symbols:star"
          :size="12"
          class="snippet-list__fav"
        />
        <button type="button" class="snippet-list__action" title="复制代码" @click="handleCopy">
          <AppIcon icon="material-symbols:content-copy" :size="13" />
        </button>
      </span>
    </template>

    <!-- ── 卡片（grid）变体 ── -->
    <template v-else>
      <label v-if="props.checkable" class="snippet-card__check" @click.stop>
        <input
          type="checkbox"
          class="snippet-card__checkbox"
          :checked="!!props.checked"
          @click="handleToggleCheck"
        />
      </label>
      <div class="snippet-card__header">
        <span class="snippet-card__title">
          {{ props.snippet.name }}
        </span>
        <span class="snippet-card__actions">
          <button
            v-if="props.snippet.favorite"
            type="button"
            class="snippet-card__action snippet-card__favorite"
            title="已收藏"
          >
            <AppIcon icon="material-symbols:star" :size="14" />
          </button>
          <button type="button" class="snippet-card__action" title="复制代码" @click="handleCopy">
            <AppIcon icon="material-symbols:content-copy" :size="14" />
          </button>
        </span>
      </div>
      <p class="snippet-card__description" :class="{ 'is-empty': !props.snippet.description }">
        {{ props.snippet.description || '暂无描述' }}
      </p>
      <div class="snippet-card__footer">
        <el-tag size="small" effect="plain" class="snippet-card__lang">
          <i
            class="snippet-card__lang-dot"
            :style="{ background: languageColor(props.snippet.language) }"
          />
          {{ languageLabel(props.snippet.language) }}
        </el-tag>
        <el-tag
          v-if="snippetDifficulty"
          class="snippet-diff-badge"
          :class="`is-${snippetDifficulty}`"
        >
          {{ difficultyText }}
        </el-tag>
        <span
          v-for="tag in (props.snippet.tags ?? []).slice(0, 2)"
          :key="tag"
          class="snippet-card__tag"
        >
          {{ tag }}
        </span>
        <span
          v-if="(props.snippet.tags ?? []).length > 2"
          class="snippet-card__tag snippet-card__tag--more"
        >
          +{{ props.snippet.tags.length - 2 }}
        </span>
        <span class="snippet-card__date">{{ formatRelative(props.snippet.updatedAt) }}</span>
        <span
          v-if="props.snippet.isPublic"
          class="snippet-card__badge"
          title="公共片段：只读，登录后可复制到自己的集合"
        >
          公共
        </span>
      </div>
    </template>
  </article>
</template>

<style scoped>
.snippet-card {
  --card-transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius, 8px);
  border: 1px solid var(--color-border-glass);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition:
    background var(--card-transition),
    border-color var(--card-transition),
    box-shadow var(--card-transition);
}

.snippet-card:hover {
  border-color: rgb(var(--color-brand-rgb) / 0.4);
  box-shadow: 0 4px 16px rgb(var(--color-shadow-rgb) / 0.12);
}

.snippet-card.is-selected {
  background: rgb(var(--color-surface-variant-rgb));
  border-color: rgb(var(--color-brand-rgb) / 0.6);
  box-shadow: 0 0 0 1px rgb(var(--color-brand-rgb) / 0.25);
}

.snippet-card__check {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  display: inline-flex;
}

.snippet-card__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.snippet-card.is-checked {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.snippet-card__header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.snippet-card__title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-heading);
  font-size: var(--text-body-sm, 0.875rem);
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.snippet-card.has-check .snippet-card__title {
  padding-left: 22px;
}

.snippet-card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--card-transition);
}

.snippet-card:hover .snippet-card__actions,
.snippet-card.is-selected .snippet-card__actions {
  opacity: 1;
}

.snippet-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background var(--card-transition),
    color var(--card-transition);
}

.snippet-card__action:hover {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.snippet-card__description {
  flex: 1;
  min-height: 3em;
  font-size: var(--text-code-sm, 0.75rem);
  line-height: 1.5;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.snippet-card__description.is-empty {
  opacity: 0.45;
}

.snippet-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-glass);
}

.snippet-card__lang {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface-variant);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-label-caps, 0.6875rem);
  font-weight: 500;
}

.snippet-card__lang-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 难度徽章样式见 main.css 全局 .snippet-diff-badge（列表/详情共用） */

.snippet-card__tag {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface-variant);
  color: var(--color-text-secondary);
  font-size: var(--text-label-caps, 0.6875rem);
}

.snippet-card__tag--more {
  opacity: 0.7;
}

.snippet-card__date {
  flex: 1;
  min-width: 0;
  font-size: var(--text-label-caps, 0.6875rem);
  color: var(--color-text-tertiary);
  text-align: right;
}

.snippet-card__badge {
  flex-shrink: 0;
  font-size: var(--text-label-caps, 0.6875rem);
  color: var(--color-text-tertiary);
}

.snippet-card__badge::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 3px;
  border-radius: 50%;
  background: var(--color-primary);
  vertical-align: middle;
}

.snippet-card__favorite {
  flex-shrink: 0;
  color: var(--color-warning);
}

/* ═════════════════════════════════════════════════════════════════════
 * 条状（list）变体 — snippetslab 极简风格
 * 设计要点：每行只展示 色点 + 标题，整行可点击，无装饰
 * ═════════════════════════════════════════════════════════════════════ */
.snippet-card.is-list {
  display: grid;
  /* [色点] [主信息(标题+描述)] [难度] [操作] */
  grid-template-columns: 12px minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 12px;
  height: auto;
  min-height: 56px;
  padding: 8px 10px 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  font-size: 0.8125rem;
  overflow: visible;
}

.snippet-card.is-list:hover {
  background: rgb(var(--color-surface-hover-rgb));
  border-color: rgb(var(--color-border-rgb));
  box-shadow: none;
}

.snippet-card.is-list.is-selected {
  background: rgb(var(--color-brand-rgb) / 0.1);
  border-color: rgb(var(--color-brand-rgb) / 0.45);
  box-shadow: none;
}

/* 语言色点 */
.snippet-list__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  align-self: center;
}

/* 主信息区：标题 + 描述（垂直两行） */
.snippet-list__text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  align-self: stretch;
  overflow: hidden;
  height: 40px;
}

.snippet-list__title {
  min-width: 0;
  height: 18px;
  line-height: 18px;
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.snippet-card.is-list.is-selected .snippet-list__title {
  color: rgb(var(--color-brand-rgb));
}

.snippet-list__desc {
  min-width: 0;
  height: 15px;
  line-height: 15px;
  font-size: 0.6875rem;
  color: rgb(var(--color-text-tertiary-rgb));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 末尾：收藏 + 操作 */
.snippet-list__end {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  align-self: center;
}

.snippet-list__fav {
  color: rgb(var(--color-warning-rgb));
  flex-shrink: 0;
}

.snippet-list__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  opacity: 0;
  transition:
    background var(--card-transition),
    color var(--card-transition),
    opacity var(--card-transition);
}

.snippet-card.is-list:hover .snippet-list__action,
.snippet-card.is-list.is-selected .snippet-list__action,
.snippet-card.is-list:focus-visible .snippet-list__action {
  opacity: 1;
}

.snippet-list__action:hover {
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-brand-rgb));
}

/* 勾选框 */
.snippet-list__check {
  position: absolute;
  left: -2px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
}

.snippet-list__checkbox {
  width: 16px;
  height: 16px;
  accent-color: rgb(var(--color-brand-rgb));
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .snippet-card {
    --card-transition: 0ms;
  }
}

/* ── 移动端触控优化 ── */
/* 操作按钮（复制）常显，触控目标 ≥44px */
.snippet-card.is-mobile .snippet-card__actions {
  opacity: 1;
}

.snippet-card.is-mobile .snippet-card__action {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 8px);
  background: rgb(var(--color-surface-variant-rgb));
}

.snippet-card.is-mobile .snippet-card__action:active {
  background: rgb(var(--color-brand-rgb) / 0.2);
  color: rgb(var(--color-brand-rgb));
}

.snippet-card.is-mobile.is-list .snippet-list__action {
  width: 44px;
  height: 44px;
  opacity: 1;
}

.snippet-card.is-mobile .snippet-card__checkbox,
.snippet-card.is-mobile .snippet-list__checkbox {
  width: 20px;
  height: 20px;
}
</style>
