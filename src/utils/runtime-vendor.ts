/**
 * 运行时 vendor 资源 URL 解析。
 *
 * 恢复推断：源文件历史丢失，且全项目已无幸存调用点（sfcRuntime /
 * sfc-modules / sfc-typescript 均未引用本模块），按「解析 public/vendor
 * 下静态资源的运行时访问地址」的语义重建最小实现，供运行时按需加载
 * 第三方资源（wasm / 编辑器语言包等）时复用。
 */

/** vendor 资源在 public 目录下的约定子目录名。 */
const VENDOR_DIR = 'vendor'

/**
 * 解析 vendor 目录下静态资源的运行时 URL，基于 import.meta.env.BASE_URL 拼接：
 *  - BASE_URL = '/' 时：resolveVendorUrl('oniguruma.wasm') → '/vendor/oniguruma.wasm'
 *  - 部署在子路径 BASE_URL = '/app/' 时 → '/app/vendor/oniguruma.wasm'
 *  - 传入 http(s)、协议相对（//）、data:、blob: 的绝对地址时原样返回，
 *    便于调用方直接透传外链 CDN 资源
 *
 * @param path - 相对 vendor 目录的资源路径（允许携带前导 '/'）
 * @returns 可直接用于 fetch / 动态加载的 URL
 */
export function resolveVendorUrl(path: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) || /^(?:data|blob):/i.test(path)) {
    return path
  }

  const base = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '')
  const relative = path.replace(/^\/+/, '')
  return `${base}/${VENDOR_DIR}/${relative}`
}
