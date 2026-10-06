<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login, checkMe } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const isDev = import.meta.env.DEV
// 后端启动时会创建默认管理员账号 admin / admin123（可通过 ADMIN_DEFAULT_PASSWORD 覆盖）
// 默认口令只在开发态参与运算：生产构建中 DEV 恒为 false，三元分支会被常量折叠为空串，
// 产物里不会残留明文口令（见审查报告 A4 ③）。
const testUsername = isDev ? (import.meta.env.VITE_TEST_USERNAME ?? 'admin') : ''
const testPassword = isDev ? (import.meta.env.VITE_TEST_PASSWORD ?? 'admin123') : ''
const canUseTestAccount = isDev && testUsername !== '' && testPassword !== ''

function loginWithTestAccount() {
  username.value = testUsername
  password.value = testPassword
  handleSubmit()
}

// 如果已有有效会话，直接跳转首页
onMounted(async () => {
  try {
    const result = await checkMe()
    if (result.user) {
      authStore.setAuth(result.user)
      router.replace({ name: 'dashboard' })
    }
  } catch {
    // 无会话或网络错误，保持登录页
  }
})

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = null
  try {
    const result = await login({
      username: username.value.trim(),
      password: password.value,
    })
    authStore.setAuth(result.user)
    toast.success('登录成功')
    router.push({ name: 'dashboard' })
  } catch (e) {
    if (e instanceof Error && e.message.includes('401')) {
      error.value = '用户名或密码错误'
    } else {
      error.value = e instanceof Error ? e.message : '登录失败，请重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 左：品牌面板（桌面专属） -->
    <aside class="login-brand" aria-hidden="true">
      <div class="login-brand__glow"></div>
      <div class="login-brand__inner">
        <div class="login-brand__logo"><span class="login-brand__gem">◆</span> Snippet</div>
        <h2 class="login-brand__title">知识片段，<br />随手可得。</h2>
        <p class="login-brand__desc">
          3,000+ 条代码片段与 392 个可在线编辑的示例，<br />
          集合树、标签、命令面板与全文搜索，一站管理。
        </p>
        <ul class="login-brand__points">
          <li>◆ 集合树与多文件片段</li>
          <li>◆ ⌘K 命令面板秒级跳转</li>
          <li>◆ JSON 导出 / 导入回灌</li>
        </ul>
      </div>
    </aside>

    <!-- 右：表单 -->
    <div class="login-main">
      <div class="login-card glass">
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-desc">登录以同步你的收藏与浏览历史</p>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="login-field">
            <label for="username" class="login-label">用户名</label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              class="login-input"
              placeholder="请输入用户名"
            />
          </div>

          <div class="login-field">
            <label for="password" class="login-label">密码</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="login-input"
              placeholder="请输入密码"
            />
          </div>

          <div v-if="error" class="login-error" role="alert">{{ error }}</div>

          <button type="submit" class="login-submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <button
          v-if="canUseTestAccount"
          type="button"
          class="login-test-btn"
          :disabled="loading"
          @click="loginWithTestAccount"
        >
          测试账号一键登录
        </button>

        <router-link :to="{ name: 'dashboard' }" class="login-back"> ← 返回首页 </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 分屏布局：左品牌右表单 */
.login-page {
  display: flex;
  min-height: 100vh;
}

.login-brand {
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

.login-brand__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(300px 300px at 70% 30%, rgb(var(--color-primary-rgb) / 0.12), transparent 70%);
}

.login-brand__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  height: 100%;
  padding: 0 10%;
}

.login-brand__logo {
  font-size: 19px;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.login-brand__gem {
  color: rgb(var(--color-primary-rgb));
  text-shadow: 0 0 16px rgb(var(--color-primary-rgb) / 0.8);
}

.login-brand__title {
  font-size: 40px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: rgb(var(--color-text-rgb));
}

.login-brand__desc {
  font-size: 14px;
  line-height: 1.8;
  color: rgb(var(--color-text-secondary-rgb));
}

.login-brand__points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13.5px;
  color: rgb(var(--color-text-secondary-rgb));
}

@media (min-width: 900px) {
  .login-brand {
    display: block;
  }
}

/* 以下是原 .login-page 旧声明（保留兜底） */
.login-page {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  min-height: 100vh;
  padding: 0;
  box-sizing: border-box;
  background: rgb(var(--color-background-rgb));
}

/* 右侧表单列：垂直水平居中卡片 */
.login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  flex: none;
  padding: 40px;
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-bright-rgb) / 0.6);
  border: 1px solid rgb(var(--color-border-glass-rgb));
}

.login-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
  margin: 0 0 8px;
  text-align: center;
}

.login-desc {
  font-size: 0.9375rem;
  color: rgb(var(--color-text-secondary-rgb));
  text-align: center;
  margin: 0 0 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgb(var(--color-text-rgb) / 0.85);
}

.login-input {
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

.login-input:focus {
  outline: none;
  border-color: rgb(var(--color-primary-rgb));
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.15);
}

.login-input::placeholder {
  color: rgb(var(--color-text-secondary-rgb) / 0.5);
}

.login-error {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: rgb(var(--color-error-rgb) / 0.12);
  color: rgb(var(--color-error-rgb));
  font-size: var(--text-sm);
}

.login-submit {
  width: 100%;
  padding: 12px 20px;
  margin-top: 8px;
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

.login-submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-test-btn {
  width: 100%;
  padding: 12px 20px;
  margin-top: 12px;
  border: 1px dashed rgb(var(--color-border-glass-rgb));
  border-radius: var(--radius-md);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.login-test-btn:hover:not(:disabled) {
  color: rgb(var(--color-primary-rgb));
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  background: rgb(var(--color-primary-rgb) / 0.08);
}

.login-test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-back {
  display: block;
  margin-top: 24px;
  text-align: center;
  font-size: var(--text-sm);
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  transition: color 0.2s;
}

.login-back:hover {
  color: rgb(var(--color-primary-rgb));
}

</style>
