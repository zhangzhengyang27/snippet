<script setup lang="ts">
/**
 * CommonCodeBlock - 课程示例通用只读代码块（恢复推断：无直接调用点）
 *
 * 供课程示例 SFC 通过 `@/components/common/code/CommonCodeBlock.vue`
 * （或 re-export 别名 GalleryCommonCodeBlock）引用，基于 ShikiCodeBlock
 * 的只读模式做轻量封装（不再加载 Monaco）。
 *
 * 用法：
 *   <CommonCodeBlock :code="content" language="typescript" />
 */
import ShikiCodeBlock from './ShikiCodeBlock.vue'

interface Props {
  /** 代码内容 */
  code?: string
  /** 代码语言（与 ShikiCodeBlock 一致的语言标识） */
  language?: string
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 最小 / 最大高度 */
  minHeight?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  code: '',
  language: 'plaintext',
  showLineNumbers: true,
  minHeight: '120px',
  maxHeight: '480px',
})
</script>

<template>
  <ShikiCodeBlock
    :code="props.code"
    :language="props.language"
    :show-line-numbers="props.showLineNumbers"
    :word-wrap="true"
    :min-height="props.minHeight"
    :max-height="props.maxHeight"
  />
</template>
