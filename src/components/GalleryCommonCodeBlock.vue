<script lang="ts">
// 多个课程统一从 `@/components/GalleryCommonCodeBlock.vue` 导入代码块组件，
// 实际实现位于 `@/components/common/code/CommonCodeBlock.vue`。
// 此处 re-export 以对齐导入路径，修复迁移后缺失的组件引用（Bug2）。
export { default } from '@/components/common/code/CommonCodeBlock.vue'
</script>
