<script setup lang="ts">
/**
 * 个人中心页。
 *
 * 背景：顶栏用户菜单的「个人中心」此前指向 /profile，但路由表里没有这条路由，
 * 点击会被 catch-all 兜底重定向回首页——入口形同虚设。本页补齐该链路。
 *
 * 信息源仅来自 authStore（后端暂无用户资料查询/更新接口），因此定位为
 * 「会话信息 + 快捷入口 + 登出」的轻量页，不虚构能力。
 * 未登录直接回登录页（带 redirect，登录后回到本页）。
 */
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useCopy } from '@/composables/useCopy'
import { toast } from '@/composables/useToast'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { copy } = useCopy()

const user = computed(() => authStore.user)
const isLoggedIn = computed(() => authStore.isLoggedIn)

const userInitials = computed(() => (user.value?.username ?? '').slice(0, 2).toUpperCase())

const roleLabel = computed(() => (user.value?.role === 'admin' ? '管理员' : '普通用户'))

onMounted(() => {
  if (!isLoggedIn.value) {
    void router.replace({ path: '/login', query: { redirect: route.fullPath } })
  }
})

async function copyUserId() {
  if (!user.value?.id) return
  const ok = await copy(user.value.id, { silent: true })
  if (ok) toast.success('用户 ID 已复制')
  else toast.error('复制失败')
}

function handleLogout() {
  void authStore.logout()
  toast.success('已退出登录')
  void router.replace('/')
}
</script>

<template>
  <div v-if="user" class="profile-page page-content">
    <PageHeader title="个人中心" description="当前登录会话的基础信息与常用入口" />

    <div class="profile-page__body">
      <!-- 会话信息卡 -->
      <section class="profile-card">
        <div class="profile-card__hero">
          <span class="profile-card__avatar">{{ userInitials }}</span>
          <div class="profile-card__identity">
            <span class="profile-card__name">{{ user.username }}</span>
            <span class="profile-card__role">{{ roleLabel }}</span>
          </div>
        </div>

        <dl class="profile-card__meta">
          <div class="profile-card__meta-row">
            <dt>用户 ID</dt>
            <dd>
              <code class="profile-card__id">{{ user.id }}</code>
              <button
                type="button"
                class="profile-card__copy"
                title="复制用户 ID"
                aria-label="复制用户 ID"
                @click="copyUserId"
              >
                <AppIcon icon="lucide:copy" :size="13" />
              </button>
            </dd>
          </div>
          <div class="profile-card__meta-row">
            <dt>角色</dt>
            <dd>{{ roleLabel }}</dd>
          </div>
        </dl>
      </section>

      <!-- 快捷入口 -->
      <section class="profile-links">
        <router-link to="/favorites" class="profile-links__item">
          <AppIcon icon="lucide:heart" :size="18" class="profile-links__icon" />
          <span class="profile-links__label">我的收藏</span>
          <AppIcon icon="lucide:chevron-right" :size="15" class="profile-links__arrow" />
        </router-link>
        <router-link to="/recent" class="profile-links__item">
          <AppIcon icon="lucide:clock" :size="18" class="profile-links__icon" />
          <span class="profile-links__label">最近浏览</span>
          <AppIcon icon="lucide:chevron-right" :size="15" class="profile-links__arrow" />
        </router-link>
        <router-link to="/snippets" class="profile-links__item">
          <AppIcon icon="lucide:code" :size="18" class="profile-links__icon" />
          <span class="profile-links__label">代码块</span>
          <AppIcon icon="lucide:chevron-right" :size="15" class="profile-links__arrow" />
        </router-link>
      </section>

      <div class="profile-page__logout">
        <AppButton variant="glass" @click="handleLogout">
          <AppIcon icon="lucide:log-out" :size="15" />
          退出登录
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  /* 宽度与留白由全局 .page-content 统一（与详情页代码区、收藏夹、最近同口径） */
  padding-block: 24px 48px;
}

.profile-page__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-card {
  padding: 22px;
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-rgb) / 0.9);
  box-shadow:
    rgb(var(--color-shadow-rgb) / 0.08) 0px 0px 0px 1px,
    0 20px 60px rgb(var(--color-shadow-rgb) / 0.06);
}

.profile-card__hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}

.profile-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-secondary-rgb)) 100%);
  color: rgb(var(--color-background-rgb));
  font-size: 1.25rem;
  font-weight: 800;
  box-shadow: 0 8px 24px rgb(var(--color-primary-rgb) / 0.25);
}

.profile-card__identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-card__name {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.profile-card__role {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgb(var(--color-primary-rgb) / 0.1);
  color: rgb(var(--color-primary-rgb));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.profile-card__meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-card__meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-card__meta-row dt {
  width: 72px;
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: rgb(var(--color-text-secondary-rgb) / 0.75);
}

.profile-card__meta-row dd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-width: 0;
}

.profile-card__id {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-text-secondary-rgb));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb) / 0.8);
  cursor: pointer;
}

.profile-card__copy:hover {
  color: rgb(var(--color-primary-rgb));
  background: rgb(var(--color-primary-rgb) / 0.08);
}

.profile-links {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-rgb) / 0.9);
  box-shadow: rgb(var(--color-shadow-rgb) / 0.08) 0px 0px 0px 1px;
  overflow: hidden;
}

.profile-links__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.profile-links__item + .profile-links__item {
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / 0.08);
}

.profile-links__item:hover {
  background: rgb(var(--color-primary-rgb) / 0.06);
  color: rgb(var(--color-text-rgb));
}

.profile-links__icon {
  color: rgb(var(--color-primary-rgb));
}

.profile-links__label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.profile-links__arrow {
  color: rgb(var(--color-text-secondary-rgb) / 0.4);
}

.profile-page__logout {
  display: flex;
  justify-content: flex-end;
}
</style>
