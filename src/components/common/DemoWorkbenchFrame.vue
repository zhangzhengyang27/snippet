<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = defineProps<{
  eyebrow?: string
  title?: string
  description?: string
  notes?: string[]
  status?: string
  compact?: boolean
  layoutVariant?: string
}>()

const slots = useSlots()

const showRail = computed(() => {
  if (props.title || props.description || props.eyebrow || props.status) return true
  return !!(slots.meta || slots.actions || slots.controls || slots.aside)
})

const filteredNotes = computed(() => (props.notes || []).filter(Boolean))
const displayDescription = computed(() =>
  String(props.description ?? '').replace(/^原始(?:文件|案例)\s*`[^`]+`[，,]\s*/, '')
)
</script>

<template>
  <section
    class="demo-workbench"
    :class="[
      compact ? 'demo-workbench--compact' : '',
      `demo-workbench--${layoutVariant || 'default'}`,
      !showRail ? 'demo-workbench--fullscreen' : '',
    ]"
  >
    <div v-if="showRail" class="demo-workbench__rail">
      <div v-if="eyebrow || status" class="demo-workbench__eyebrow-row">
        <span v-if="eyebrow" class="demo-workbench__eyebrow demo-tag">{{ eyebrow }}</span>
        <span v-if="status" class="demo-workbench__status demo-tag demo-tag--success">{{
          status
        }}</span>
      </div>

      <div v-if="title || displayDescription" class="demo-workbench__headline">
        <div>
          <h2 v-if="title" class="demo-workbench__title">{{ title }}</h2>
          <p v-if="displayDescription" class="demo-workbench__description">
            {{ displayDescription }}
          </p>
        </div>
        <div v-if="$slots.meta" class="demo-workbench__meta">
          <slot name="meta" />
        </div>
      </div>

      <div
        v-if="filteredNotes.length || $slots.actions || $slots.controls || $slots.aside"
        class="demo-workbench__control-card demo-card demo-card--muted"
      >
        <div v-if="$slots.actions" class="demo-workbench__actions">
          <slot name="actions" />
        </div>
        <div v-if="$slots.controls" class="demo-workbench__controls">
          <slot name="controls" />
        </div>
        <div v-if="filteredNotes.length" class="demo-workbench__notes">
          <p v-for="note in filteredNotes" :key="note">{{ note }}</p>
        </div>
        <div v-if="$slots.aside" class="demo-workbench__aside">
          <slot name="aside" />
        </div>
      </div>
    </div>

    <div class="demo-workbench__stage-card demo-card demo-card--shadow">
      <div class="demo-workbench__stage">
        <slot name="stage">
          <slot />
        </slot>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-workbench {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 24px;
  height: 100%;
  min-height: 0;
  padding: 28px;
  background:
    radial-gradient(circle at 0 0, rgb(var(--color-primary-rgb) / 0.18), transparent 30%),
    radial-gradient(circle at 100% 0, rgb(var(--color-secondary-rgb) / 0.2), transparent 28%),
    linear-gradient(
      145deg,
      rgb(var(--color-surface-rgb)) 0%,
      rgb(var(--color-surface-bright-rgb)) 38%,
      rgb(var(--color-surface-variant-rgb)) 100%
    );
}

.demo-workbench--fullscreen {
  grid-template-columns: 1fr;
}

.demo-workbench__rail {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.demo-workbench__eyebrow-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  font-size: var(--text-label-caps);
  font-weight: 600;
  color: rgb(var(--color-primary-rgb));
  white-space: nowrap;
}

.demo-tag--success {
  background: rgb(var(--color-tertiary-rgb) / 0.12);
  color: rgb(var(--color-tertiary-rgb));
}

.demo-card {
  border-radius: var(--radius-lg, 0.5rem);
  background: rgb(var(--color-surface-rgb));
}

.demo-card--muted {
  background: rgb(var(--color-surface-bright-rgb) / 0.72);
  box-shadow: none;
}

.demo-card--shadow {
  box-shadow: 0 12px 28px rgb(var(--color-shadow-rgb) / 0.2);
}

.demo-workbench__headline {
  display: grid;
  gap: 16px;
}

.demo-workbench__title {
  margin: 0;
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  line-height: 1.1;
  color: rgb(var(--color-text-rgb) / 0.96);
}

.demo-workbench__description {
  margin: 12px 0 0;
  line-height: 1.75;
  color: rgb(var(--color-text-secondary-rgb) / 0.86);
}

.demo-workbench__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-workbench__control-card {
  border-radius: var(--radius-xl, 0.75rem);
  padding: 16px;
}

.demo-workbench__actions,
.demo-workbench__controls,
.demo-workbench__aside {
  display: grid;
  gap: 12px;
}

.demo-workbench__controls + .demo-workbench__notes,
.demo-workbench__actions + .demo-workbench__notes,
.demo-workbench__notes + .demo-workbench__aside {
  margin-top: 16px;
}

.demo-workbench__notes {
  display: grid;
  gap: 12px;
}

.demo-workbench__notes p {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-xl, 1.5rem);
  background: rgb(var(--color-surface-rgb) / 0.78);
  color: rgb(var(--color-text-secondary-rgb) / 0.84);
  line-height: 1.7;
}

.demo-workbench__stage-card {
  min-height: 0;
  overflow: hidden;
  border-radius: var(--radius-xl, 1.5rem);
}

.demo-workbench__stage {
  height: 100%;
  min-height: 0;
}
</style>
