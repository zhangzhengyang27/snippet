/**
 * 浏览器端文件下载工具。
 *
 * 恢复推断：源文件历史丢失，且全项目已无幸存调用点（snippet-export-import.ts
 * 内部自带一份私有 downloadBlob，未引用本模块），按项目既有下载实现
 * （createObjectURL + 临时 <a> 触发 + revokeObjectURL）重建以下通用导出，
 * 供后续功能（导出 / 备份等）复用。
 */

/**
 * 触发浏览器下载一个 Blob。
 *
 * @param filename - 保存到本地的文件名（含扩展名）
 * @param blob - 待下载的二进制内容
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * 触发浏览器下载一段文本（UTF-8 编码）。
 *
 * @param filename - 保存到本地的文件名（含扩展名）
 * @param text - 待下载的文本内容
 */
export function downloadText(filename: string, text: string): void {
  downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }))
}
