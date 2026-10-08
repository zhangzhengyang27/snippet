<script setup lang="ts">
/**
 * 个人中心页。
 *
 * 信息源为 authStore（会话恢复时 /auth/me 已带回 email / displayName）。
 * 本页提供：会话信息展示 + 修改密码 + 常用入口 + 登出。
 * 未登录直接回登录页（带 redirect，登录后回到本页）。
 *
 * 「找回密码」本段未实现（需要邮件基础设施），因此这里只提供**已登录改密码**。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { changePassword } from '@/api/auth'
import { getApiErrorMessage } from '@/api/client'
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

const displayName = computed(() => user.value?.displayName || user.value?.username || '')
const userInitials = computed(() => displayName.value.slice(0, 2).toUpperCase())
const roleLabel = computed(() => (user.value?.role === 'admin' ? '管理员' : '普通用户'))
const emailLabel = computed(() => user.value?.email || '未绑定')

// ---------- 修改密码 ----------
const showPasswordForm = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordLoading = ref(false)
const passwordError = ref<string | null>(null)

function resetPasswordForm() {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = null
}

function togglePasswordForm() {
  showPasswordForm.value = !showPasswordForm.value
  if (!showPasswordForm.value) resetPasswordForm()
}

async function handleChangePassword() {
  passwordError.value = null

  if (!oldPassword.value) {
    passwordError.value = '请输入当前密码'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = '新密码至少 8 个字符'
    return
  }
  if (newPassword.value.length > 72) {
    passwordError.value = '新密码最多 72 个字符'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  if (oldPassword.value === newPassword.value) {
    passwordError.value = '新密码不能与当前密码相同'
    return
  }

  passwordLoading.value = true
  try {
    await changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    toast.success('密码已更新')
    showPasswordForm.value = false
    resetPasswordForm()
  } catch (e) {
    passwordError.value = getApiErrorMessage(e, '修改失败，请重试')
  } finally {
    passwordLoading.value = false
  }
}

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
            <span class="profile-card__name">{{ displayName }}</span>
            <span v-if="user.displayName && user.displayName !== user.username" class="profile-card__handle">
              @{{ user.username }}
            </span>
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
            <dt>邮箱</dt>
            <dd>{{ emailLabel }}</dd>
          </div>
          <div class="profile-card__meta-row">
            <dt>角色</dt>
            <dd>{{ roleLabel }}</dd>
          </div>
        </dl>
      </section>

      <!-- 安全设置：修改密码 -->
      <section class="profile-card profile-security">
        <div class="profile-security__head">
          <div>
            <h2 class="profile-security__title">安全设置</h2>
            <p class="profile-security__hint">定期更换密码可以提升账号安全性</p>
          </div>
          <AppButton variant="glass" @click="togglePasswordForm">
            <AppIcon :icon="showPasswordForm ? 'lucide:x' : 'lucide:key-round'" :size="15" />
            {{ showPasswordForm ? '取消' : '修改密码' }}
          </AppButton>
        </div>

        <form v-if="showPasswordForm" class="password-form" @submit.prevent="handleChangePassword">
          <div class="password-form__field">
            <label for="old-password" class="password-form__label">当前密码</label>
            <input
              id="old-password"
              v-model="oldPassword"
              type="password"
              autocomplete="current-password"
              class="password-form__input"
              placeholder="请输入当前密码"
            />
          </div>
          <div class="password-form__field">
            <label for="new-password" class="password-form__label">新密码</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              class="password-form__input"
              placeholder="至少 8 个字符"
            />
          </div>
          <div class="password-form__field">
            <label for="confirm-password" class="password-form__label">确认新密码</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="password-form__input"
              placeholder="再次输入新密码"
            />
          </div>

          <div v-if="passwordError" class="password-form__error" role="alert">
            {{ passwordError }}
          </div>

          <div class="password-form__actions">
            <button type="submit" class="password-form__submit" :disabled="passwordLoading">
              {{ passwordLoading ? '提交中...' : '确认修改' }}
            </button>
          </div>
        </form>
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
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}

.profile-card__name {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.profile-card__handle {
  font-size: 0.8125rem;
  color: rgb(var(--color-text-secondary-rgb));
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
  font-size: 0.875rem;
  color: rgb(var(--color-text-rgb));
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

/* ---------- 安全设置 ---------- */
.profile-security__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.profile-security__title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.profile-security__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(var(--color-text-secondary-rgb));
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}

.password-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-form__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgb(var(--color-text-rgb) / 0.85);
}

.password-form__input {
  width: 100%;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgb(var(--color-border-glass-rgb));
  background: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-rgb));
  font-size: 0.875rem;
  box-sizing: border-box;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.password-form__input:focus {
  outline: none;
  border-color: rgb(var(--color-primary-rgb));
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.15);
}

.password-form__error {
  padding: 10px 14px;
  border-radius: var(--radius);
  background: rgb(var(--color-error-rgb) / 0.12);
  color: rgb(var(--color-error-rgb));
  font-size: var(--text-sm);
}

.password-form__actions {
  display: flex;
  justify-content: flex-start;
}

.password-form__submit {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(
    135deg,
    rgb(var(--color-primary-rgb)) 0%,
    rgb(var(--color-secondary-rgb)) 100%
  );
  color: rgb(var(--color-background-rgb));
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.password-form__submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.password-form__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
