<script setup lang="ts">
/**
 * DownloadButton - 示例下载按钮（恢复重建）
 *
 * 将示例的 html/css/js 组装为可独立运行的 HTML 文件并通过 Blob 触发下载。
 *
 * 用法：
 *   <DownloadButton :example="example" />
 */
import type { CodeExample } from '@/types'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 目标示例 */
  example: CodeExample
}

const props = defineProps<Props>()

/** 组装单文件 HTML：内联样式与脚本，保证下载后可直接打开 */
function buildStandaloneHtml(example: CodeExample): string {
  // \x3C 为 "<" 的转义，避免 SFC 内出现字面 <script> 标签破坏解析
  const style = example.css ? `\n  <style>\n${example.css}\n  </style>` : ''
  const script = example.js ? `\n  \x3Cscript>\n${example.js}\n  \x3C/script>` : ''
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${example.title}</title>${style}
</head>
<body>
${example.html || ''}${script}
</body>
</html>
`
}

/** 清理文件名中的非法字符 */
function toSafeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'example'
}

function handleDownload() {
  const html = buildStandaloneHtml(props.example)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${toSafeFilename(props.example.title)}.html`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <AppButton
    variant="glass"
    size="small"
    class="download-button"
    :title="`下载「${props.example.title}」源码`"
    @click="handleDownload"
  >
    <AppIcon icon="ms:file_download" :size="16" />
    下载
  </AppButton>
</template>
