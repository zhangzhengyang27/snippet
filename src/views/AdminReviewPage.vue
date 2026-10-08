<script setup lang="ts">
/**
 * 内容审核台（管理员）。
 *
 * 用户提交的片段在此裁决后才进入公共代码块库：
 * - 通过 → `isPublic = true`，出现在 `/library`；
 * - 退回 → 保持私有，理由回传给作者（作者在「我的代码块」里能看到并重新提交）。
 *
 * 入口只在管理员身份下出现在顶栏用户菜单，页面内再做一次角色校验；
 * 真正的权限边界在后端 `RolesGuard` + `@Roles('admin')` —— 前端校验只是体验优化。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { getApiErrorMessage } from '@/api/client'
import { listModerationQueue, moderateKnowledgeSnippet } from '@/api/knowledge-snippets'
import type { ModerationQueueItem, SnippetModerationStatus } from '@/types/knowledge-snippet'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/date-format'
import { languageLabel } from '@/utils/snippet-languages'

const router = useRouter()
const authStore = useAuthStore()
const { toast } = useToast()

type StatusTab = { value: SnippetModerationStatus; label: string; hint: string }

const tabs: StatusTab[] = [
  { value: 'pending', label: '待审核', hint: '条等待裁决' },
  { value: 'approved', label: '已通过', hint: '条已在公共库' },
  { value: 'rejected', label: '未通过', hint: '条已退回作者' },
]

const activeStatus = ref<SnippetModerationStatus>('pending')
const items = ref<ModerationQueueItem[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
/** 正在执行审核动作的片段 id（禁用该行按钮，防重复提交） */
const actingId = ref('')
/** 正在填写退回理由的片段 id */
const rejectingId = ref('')
const rejectNote = ref('')
/** 展开查看正文的片段 id 集合 */
const expandedIds = ref<Set<string>>(new Set())

const isAdmin = computed(() => authStore.user?.role === 'admin')
const activeTab = computed(() => tabs.find(tab => tab.value === activeStatus.value) ?? tabs[0])

async function loadQueue() {
  loading.value = true
  loadError.value = ''

  try {
    // pageSize 取上限：审核是「清空队列」型操作，分页反而增加点击成本
    const result = await listModerationQueue({ status: activeStatus.value, pageSize: 100 })
    items.value = result.items
    total.value = result.total
  } catch (error) {
    loadError.value = getApiErrorMessage(error, '加载审核队列失败。')
  } finally {
    loading.value = false
  }
}

function switchTab(status: SnippetModerationStatus) {
  if (activeStatus.value === status) return
  activeStatus.value = status
  cancelReject()
  void loadQueue()
}

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
}

async function approve(item: ModerationQueueItem) {
  actingId.value = item.id

  try {
    await moderateKnowledgeSnippet(item.id, { action: 'approve' })
    toast.success(`「${item.name}」已通过审核，可在公共代码块库中查看。`)
    await loadQueue()
  } catch (error) {
    toast.error(getApiErrorMessage(error, '审核操作失败。'))
  } finally {
    actingId.value = ''
  }
}

function startReject(item: ModerationQueueItem) {
  rejectingId.value = item.id
  rejectNote.value = ''
}

function cancelReject() {
  rejectingId.value = ''
  rejectNote.value = ''
}

async function confirmReject(item: ModerationQueueItem) {
  actingId.value = item.id

  try {
    await moderateKnowledgeSnippet(item.id, {
      action: 'reject',
      note: rejectNote.value.trim() || undefined,
    })
    toast.success(`已退回「${item.name}」，作者会看到未通过原因。`)
    cancelReject()
    await loadQueue()
  } catch (error) {
    toast.error(getApiErrorMessage(error, '审核操作失败。'))
  } finally {
    actingId.value = ''
  }
}

onMounted(async () => {
  // 直接输入 URL 进入时，认证状态可能尚未恢复（页面 onMounted 早于 App 的初始化）
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (!isAdmin.value) {
    toast.error('只有管理员可以访问内容审核台。')
    void router.replace({ name: 'dashboard' })
    return
  }

  await loadQueue()
})
</script>

<template>
  <div class="review-page">
    <header class="review-page__head">
      <div class="review-page__head-main">
        <h1 class="review-page__title">内容审核台</h1>
        <p class="review-page__subtitle">
          用户提交的代码片段经此裁决后才进入公共代码块库。通过即上架；退回会连同原因返还作者，
          作者可修改后重新提交。
        </p>
      </div>
      <div class="review-page__stat">
        <span class="review-page__stat-value">{{ total }}</span>
        <span class="review-page__stat-label">{{ activeTab.hint }}</span>
      </div>
    </header>

    <nav class="review-page__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="review-page__tab"
        :class="{ 'is-active': activeStatus === tab.value }"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="loadError" class="review-page__message review-page__message--error">
      <AppIcon icon="material-symbols:error-outline" :size="15" />
      {{ loadError }}
    </p>

    <p v-else-if="loading" class="review-page__message">正在加载…</p>

    <div v-else-if="items.length === 0" class="review-page__empty">
      <AppIcon icon="material-symbols:inbox" :size="30" />
      <p>当前没有{{ activeTab.label }}的片段</p>
    </div>

    <ul v-else class="review-page__list">
      <li v-for="item in items" :key="item.id" class="review-card">
        <div class="review-card__head">
          <div class="review-card__title-row">
            <span class="review-card__lang">{{ languageLabel(item.language) }}</span>
            <h2 class="review-card__name" :title="item.name">{{ item.name }}</h2>
          </div>
          <div class="review-card__meta">
            <span class="review-card__author">
              <AppIcon icon="material-symbols:person" :size="13" />
              {{ item.authorName || item.authorUsername || '未知用户' }}
            </span>
            <span class="review-card__time">{{ formatDateTime(item.updatedAt) }}</span>
          </div>
        </div>

        <p v-if="item.description" class="review-card__desc">{{ item.description }}</p>

        <div class="review-card__code-wrap">
          <pre
            class="review-card__code"
            :class="{ 'is-collapsed': !expandedIds.has(item.id) }"
            >{{ item.content }}</pre
          >
          <button type="button" class="review-card__expand" @click="toggleExpand(item.id)">
            {{ expandedIds.has(item.id) ? '收起' : '展开全文' }}
          </button>
        </div>

        <div v-if="item.tags.length > 0" class="review-card__tags">
          <span v-for="tag in item.tags" :key="tag" class="review-card__tag">#{{ tag }}</span>
        </div>

        <!-- 退回理由输入（点「退回」后展开） -->
        <div v-if="rejectingId === item.id" class="review-card__reject">
          <input
            v-model="rejectNote"
            class="review-card__reject-input"
            type="text"
            maxlength="200"
            aria-label="未通过原因"
            placeholder="填写未通过原因（会展示给作者）"
          />
          <div class="review-card__reject-actions">
            <AppButton variant="text" size="small" @click="cancelReject">取消</AppButton>
            <AppButton
              variant="primary"
              size="small"
              :disabled="actingId === item.id"
              @click="confirmReject(item)"
            >
              确认退回
            </AppButton>
          </div>
        </div>

        <div v-else-if="activeStatus === 'pending'" class="review-card__actions">
          <AppButton
            variant="glass"
            size="small"
            :disabled="actingId === item.id"
            @click="startReject(item)"
          >
            退回
          </AppButton>
          <AppButton
            variant="primary"
            size="small"
            :disabled="actingId === item.id"
            @click="approve(item)"
          >
            通过并上架
          </AppButton>
        </div>

        <p v-else-if="item.moderationNote" class="review-card__note">
          审核备注：{{ item.moderationNote }}
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.review-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 20px 72px;
}

.review-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.review-page__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.review-page__subtitle {
  margin: 0;
  max-width: 560px;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: rgb(var(--color-text-secondary-rgb));
}

.review-page__stat {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.review-page__stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--color-primary-rgb));
}

.review-page__stat-label {
  font-size: var(--text-xs);
  color: rgb(var(--color-text-secondary-rgb));
}

.review-page__tabs {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 18px;
  padding: 4px;
  border-radius: 10px;
  background: rgb(var(--color-surface-glass-rgb) / 0.6);
}

.review-page__tab {
  padding: 6px 16px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.review-page__tab:hover {
  color: rgb(var(--color-text-rgb));
}

.review-page__tab.is-active {
  background: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-rgb));
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(var(--color-shadow-rgb) / 0.12);
}

.review-page__message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 24px 0;
  font-size: var(--text-sm);
  color: rgb(var(--color-text-secondary-rgb));
}

.review-page__message--error {
  color: rgb(var(--color-error-rgb));
}

.review-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 0;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: var(--text-sm);
}

.review-page__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.review-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--color-border-glass);
  border-radius: 12px;
  background: var(--color-surface);
}

.review-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.review-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.review-card__lang {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-size: 12px;
}

.review-card__name {
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.review-card__meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--text-xs);
  color: rgb(var(--color-text-secondary-rgb));
}

.review-card__author {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.review-card__desc {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: rgb(var(--color-text-secondary-rgb));
}

.review-card__code-wrap {
  position: relative;
}

.review-card__code {
  margin: 0;
  padding: 12px;
  max-height: 260px;
  overflow: auto;
  border-radius: 8px;
  background: rgb(var(--color-background-rgb));
  border: 1px solid var(--color-border-glass);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  color: rgb(var(--color-text-rgb));
  white-space: pre;
}

.review-card__code.is-collapsed {
  max-height: 116px;
  overflow: hidden;
}

.review-card__expand {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--color-primary-rgb));
  font-size: var(--text-xs);
  cursor: pointer;
}

.review-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.review-card__tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgb(var(--color-surface-glass-rgb) / 0.7);
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 11px;
}

.review-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.review-card__reject {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgb(var(--color-error-rgb) / 0.06);
}

.review-card__reject-input {
  padding: 7px 10px;
  border: 1px solid rgb(var(--color-error-rgb) / 0.35);
  border-radius: 8px;
  background: var(--color-surface);
  color: rgb(var(--color-text-rgb));
  font-size: var(--text-sm);
  outline: none;
}

.review-card__reject-input:focus {
  border-color: rgb(var(--color-error-rgb));
}

.review-card__reject-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.review-card__note {
  margin: 0;
  font-size: var(--text-xs);
  color: rgb(var(--color-text-secondary-rgb));
}

@media (max-width: 640px) {
  .review-page__head {
    flex-direction: column;
  }

  .review-page__stat {
    align-items: flex-start;
  }
}
</style>
