<script setup lang="ts">
/**
 * 注册页。
 *
 * 与登录页同一套视觉（左侧品牌面板 + 右侧卡片），字段按后端 RegisterDto 的规则
 * 做**前端预校验**（用户名 3–30、邮箱格式、密码 ≥8 且两次一致），减少无效请求。
 * 真正的裁决仍以后端为准 —— 前端校验只为体验，不作为安全边界。
 *
 * 注册成功后后端已下发会话 cookie，这里直接 setAuth 并跳转，无需二次登录。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register, checkMe } from '@/api/auth'
import { getApiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')

const loading = ref(false)
const error = ref<string | null>(null)

/** 与后端 RegisterDto 保持一致的用户名白名单。 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const redirectTarget = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') ? raw : null
})

onMounted(async () => {
  try {
    const result = await checkMe()
    if (result.user) {
      authStore.setAuth(result.user)
      router.replace(redirectTarget.value ?? { name: 'dashboard' })
    }
  } catch {
    // 无会话：停留在注册页
  }
})

/** 返回第一条校验错误，全部通过则返回 null。 */
function validate(): string | null {
  const name = username.value.trim()
  if (!name) return '请输入用户名'
  if (name.length < 3) return '用户名至少 3 个字符'
  if (name.length > 30) return '用户名最多 30 个字符'
  if (!USERNAME_PATTERN.test(name)) return '用户名只能包含中文、字母、数字、下划线或连字符'

  const mail = email.value.trim()
  if (!mail) return '请输入邮箱'
  if (!EMAIL_PATTERN.test(mail)) return '邮箱格式不正确'

  if (!password.value) return '请输入密码'
  if (password.value.length < 8) return '密码至少 8 个字符'
  if (password.value.length > 72) return '密码最多 72 个字符'
  if (password.value !== confirmPassword.value) return '两次输入的密码不一致'

  if (displayName.value.trim().length > 30) return '展示名最多 30 个字符'

  return null
}

async function handleSubmit() {
  const invalid = validate()
  if (invalid) {
    error.value = invalid
    return
  }

  loading.value = true
  error.value = null
  try {
    const result = await register({
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      ...(displayName.value.trim() ? { displayName: displayName.value.trim() } : {}),
    })
    authStore.setAuth(result.user)
    toast.success('注册成功，已自动登录')
    router.push(redirectTarget.value ?? { name: 'dashboard' })
  } catch (e) {
    error.value = getApiErrorMessage(e, '注册失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- 左：品牌面板（桌面专属） -->
    <aside class="register-brand" aria-hidden="true">
      <div class="register-brand__glow"></div>
      <div class="register-brand__inner">
        <div class="register-brand__logo"><span class="register-brand__gem">◆</span> Snippet</div>
        <h2 class="register-brand__title">知识片段，<br />随手可得。</h2>
        <p class="register-brand__desc">
          3,000+ 条代码片段，集合树、标签、命令面板<br />
          与全文搜索，一站管理你的知识库。
        </p>
        <ul class="register-brand__points">
          <li>◆ 集合树与多文件片段</li>
          <li>◆ ⌘K 命令面板秒级跳转</li>
          <li>◆ JSON 导出 / 导入回灌</li>
        </ul>
      </div>
    </aside>

    <!-- 右：表单 -->
    <div class="register-main">
      <div class="register-card glass">
        <h1 class="register-title">创建账号</h1>
        <p class="register-desc">注册后即可收藏片段、发布自己的代码块</p>

        <form class="register-form" @submit.prevent="handleSubmit">
          <div class="register-field">
            <label for="reg-username" class="register-label">用户名</label>
            <input
              id="reg-username"
              v-model="username"
              type="text"
              autocomplete="username"
              class="register-input"
              placeholder="3–30 个字符，支持中文/字母/数字/_/-"
            />
          </div>

          <div class="register-field">
            <label for="reg-email" class="register-label">邮箱</label>
            <input
              id="reg-email"
              v-model="email"
              type="email"
              autocomplete="email"
              class="register-input"
              placeholder="用于登录与找回账号"
            />
          </div>

          <div class="register-field">
            <label for="reg-password" class="register-label">密码</label>
            <input
              id="reg-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              class="register-input"
              placeholder="至少 8 个字符"
            />
          </div>

          <div class="register-field">
            <label for="reg-confirm" class="register-label">确认密码</label>
            <input
              id="reg-confirm"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="register-input"
              placeholder="再次输入密码"
            />
          </div>

          <div class="register-field">
            <label for="reg-display" class="register-label">展示名（可选）</label>
            <input
              id="reg-display"
              v-model="displayName"
              type="text"
              autocomplete="nickname"
              class="register-input"
              placeholder="留空则显示用户名"
            />
          </div>

          <div v-if="error" class="register-error" role="alert">{{ error }}</div>

          <button type="submit" class="register-submit" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <p class="register-alt">
          已有账号？
          <router-link :to="{ name: 'login', query: route.query }" class="register-alt__link">
            去登录
          </router-link>
        </p>

        <router-link :to="{ name: 'dashboard' }" class="register-back"> ← 返回首页 </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  min-height: 100vh;
  background: rgb(var(--color-background-rgb));
  box-sizing: border-box;
}

/* ---------- 左：品牌面板 ---------- */
.register-brand {
  position: relative;
  display: none;
  flex: 1;
  overflow: hidden;
  background:
    radial-gradient(520px 360px at 20% 12%, rgb(var(--color-primary-rgb) / 0.22), transparent 62%),
    radial-gradient(420px 300px at 78% 82%, rgb(56 189 248 / 0.12), transparent 60%),
    rgb(var(--color-background-rgb));
  border-right: 1px solid rgb(var(--color-border-rgb) / 0.5);
}

.register-brand__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(300px 300px at 70% 30%, rgb(var(--color-primary-rgb) / 0.12), transparent 70%);
}

.register-brand__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  height: 100%;
  padding: 0 10%;
}

.register-brand__logo {
  font-size: 19px;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.register-brand__gem {
  color: rgb(var(--color-primary-rgb));
  text-shadow: 0 0 16px rgb(var(--color-primary-rgb) / 0.8);
}

.register-brand__title {
  font-size: 40px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: rgb(var(--color-text-rgb));
}

.register-brand__desc {
  font-size: 14px;
  line-height: 1.8;
  color: rgb(var(--color-text-secondary-rgb));
}

.register-brand__points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13.5px;
  color: rgb(var(--color-text-secondary-rgb));
}

@media (min-width: 900px) {
  .register-brand {
    display: block;
  }
}

/* ---------- 右：表单 ---------- */
.register-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.register-card {
  width: 100%;
  max-width: 420px;
  flex: none;
  padding: 40px;
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-bright-rgb) / 0.6);
  border: 1px solid rgb(var(--color-border-glass-rgb));
}

.register-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
  margin: 0 0 8px;
  text-align: center;
}

.register-desc {
  font-size: 0.9375rem;
  color: rgb(var(--color-text-secondary-rgb));
  text-align: center;
  margin: 0 0 28px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.register-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.register-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgb(var(--color-text-rgb) / 0.85);
}

.register-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgb(var(--color-border-glass-rgb));
  background: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-rgb));
  font-size: 0.9375rem;
  box-sizing: border-box;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.register-input:focus {
  outline: none;
  border-color: rgb(var(--color-primary-rgb));
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.15);
}

.register-input::placeholder {
  color: rgb(var(--color-text-secondary-rgb) / 0.5);
}

.register-error {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: rgb(var(--color-error-rgb) / 0.12);
  color: rgb(var(--color-error-rgb));
  font-size: var(--text-sm);
}

.register-submit {
  width: 100%;
  padding: 12px 20px;
  margin-top: 4px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(
    135deg,
    rgb(var(--color-primary-rgb)) 0%,
    rgb(var(--color-secondary-rgb)) 100%
  );
  color: rgb(var(--color-background-rgb));
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.register-submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.register-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-alt {
  margin: 20px 0 0;
  text-align: center;
  font-size: var(--text-sm);
  color: rgb(var(--color-text-secondary-rgb));
}

.register-alt__link {
  color: rgb(var(--color-primary-rgb));
  font-weight: 600;
  text-decoration: none;
}

.register-alt__link:hover {
  text-decoration: underline;
}

.register-back {
  display: block;
  margin-top: 20px;
  text-align: center;
  font-size: var(--text-sm);
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  transition: color 0.2s;
}

.register-back:hover {
  color: rgb(var(--color-primary-rgb));
}
</style>
