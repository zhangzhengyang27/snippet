<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="page-header">
    <h1 class="page-header__title">{{ title }}</h1>
    <p v-if="description" class="page-header__desc">{{ description }}</p>
  </header>
</template>

<style scoped>
.page-header {
  padding: 20px 22px 18px;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, rgb(var(--color-primary-rgb) / 0.08), transparent 30%),
    radial-gradient(circle at left bottom, rgb(var(--color-tertiary-rgb) / 0.05), transparent 24%),
    rgb(var(--color-surface-rgb) / 0.9);
  box-shadow:
    rgb(var(--color-shadow-rgb) / 0.08) 0px 0px 0px 1px,
    0 20px 60px rgb(var(--color-shadow-rgb) / 0.06);
  margin-bottom: 24px;
}

.page-header__title {
  margin: 0 0 8px;
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgb(var(--color-text-rgb));
}

.page-header__desc {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: rgb(var(--color-text-secondary-rgb) / 0.78);
}

</style>
