#!/usr/bin/env node
/**
 * convert-static-site-tailwind.mjs
 * 将 /public/static-sites/<dir> 的静态站点转换为 Tailwind CSS 示例。
 *
 * 策略（全工具类重写）：
 *  1. 注入 Tailwind Play CDN + tailwind.config（从 :root 提取品牌色）。
 *  2. Bootstrap 工具类 + 组件类 → Tailwind 工具类（完整映射表）。
 *  3. 站点自定义 CSS 规则逐条翻译：可映射声明 → 工具类追加到元素；
 *     不可映射（伪元素/动画/媒体查询/复杂选择器）保留进 <style> 兜底。
 *  4. 移除 Bootstrap CSS/JS CDN；保留站点自身 scripts.js；
 *     追加极简 vanilla polyfill 复现 data-bs-toggle 的 collapse/dropdown 切换。
 *  5. 原 index.html 备份为 index.original.html（已存在则跳过）。
 *
 * 增强（v2）：
 *  - 多页：扫描站点目录下（含子目录，排除 assets/css/js/vendor 等）所有 *.html 逐页转换。
 *  - 幂等：重跑时先剥离上一轮注入的 Tailwind CDN / 配置 / 遗留 <style> / polyfill
 *    （用 data-tw-injected 标记 + 旧注释特征识别），避免重复注入。
 *
 * 用法：node scripts/convert-static-site-tailwind.mjs <dir> [dir ...]
 *   dir 可为整数目录名（如 99）或 wegic 子目录（如 wegic/86）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SITES_DIR = path.join(ROOT, 'public', 'static-sites')

/* ----------------------------- 工具函数 ----------------------------- */
const remToNum = (v) => {
  v = v.trim()
  if (v.endsWith('rem')) return parseFloat(v) * 16
  if (v.endsWith('em')) return parseFloat(v) * 16
  if (v.endsWith('px')) return parseFloat(v)
  return null
}
// 把 px 映射到 Tailwind 间距刻度（4px 一档），否则用 arbitrary
const spacingUtil = (prefix, px) => {
  const n = px / 4
  const rounded = Math.round(n)
  if (Math.abs(n - rounded) < 0.01 && rounded >= 0 && rounded <= 96) {
    return `${prefix}-${rounded}`
  }
  return `${prefix}-[${px}px]`
}
const colorUtil = (prefix, value) => {
  const v = value.trim()
  if (/^#|^rgb|^hsl/i.test(v)) return `${prefix}-[${v.replace(/\s+/g, '')}]`
  if (v === 'transparent') return `${prefix}-transparent`
  if (v === 'currentColor') return `${prefix}-current`
  if (v === 'white') return `${prefix}-white`
  if (v === 'black') return `${prefix}-black`
  return null
}
const radiusUtil = (px) => {
  const n = px / 4
  const rounded = Math.round(n)
  if (Math.abs(n - rounded) < 0.01 && rounded >= 0 && rounded <= 96) return `rounded-${rounded}`
  return `rounded-[${px}px]`
}

/* ----------------------- 自定义 CSS 声明翻译 ----------------------- */
function translateDecl(prop, rawVal) {
  let val = rawVal.replace(/!important/g, '').trim()
  const out = []
  const push = (u) => u && out.push(u)

  switch (prop.toLowerCase()) {
    case 'display': {
      const m = {
        flex: 'flex', 'inline-flex': 'inline-flex', block: 'block',
        'inline-block': 'inline-block', 'inline': 'inline', grid: 'grid',
        'inline-grid': 'inline-grid', none: 'hidden', 'list-item': 'list-item',
        'table': 'table', 'table-row': 'table-row', 'table-cell': 'table-cell',
      }
      if (m[val]) push(m[val])
      break
    }
    case 'position': {
      const m = { relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky', static: 'static' }
      if (m[val]) push(m[val])
      break
    }
    case 'visibility': if (val === 'hidden') push('invisible'); else if (val === 'visible') push('visible'); break
    case 'overflow': if (val === 'hidden') push('overflow-hidden'); else if (val === 'auto') push('overflow-auto'); else if (val === 'scroll') push('overflow-scroll'); break
    case 'overflow-x': if (val === 'hidden') push('overflow-x-hidden'); else if (val === 'auto') push('overflow-x-auto'); break
    case 'overflow-y': if (val === 'hidden') push('overflow-y-hidden'); else if (val === 'auto') push('overflow-y-auto'); break
    case 'width': {
      if (val === '100%') push('w-full'); else if (val === 'auto') push('w-auto')
      else if (val.endsWith('%')) push(`w-[${val}]`)
      else { const px = remToNum(val); if (px != null) push(px === 100 ? 'w-full' : spacingUtil('w', px)) }
      break
    }
    case 'height': {
      if (val === '100%') push('h-full'); else if (val === 'auto') push('h-auto')
      else if (val.endsWith('%')) push(`h-[${val}]`)
      else { const px = remToNum(val); if (px != null) push(px === 100 ? 'h-full' : spacingUtil('h', px)) }
      break
    }
    case 'max-width': if (val.endsWith('%') || /px|rem/.test(val)) push(`max-w-[${val.replace(/\s+/g, '')}]`); break
    case 'min-width': if (/px|rem|%/.test(val)) push(`min-w-[${val.replace(/\s+/g, '')}]`); break
    case 'min-height': if (/px|rem|%/.test(val)) push(`min-h-[${val.replace(/\s+/g, '')}]`); break
    case 'flex-direction': if (val === 'column') push('flex-col'); else if (val === 'column-reverse') push('flex-col-reverse'); else if (val === 'row') push('flex-row'); else if (val === 'row-reverse') push('flex-row-reverse'); break
    case 'flex-wrap': if (val === 'wrap') push('flex-wrap'); else if (val === 'nowrap') push('flex-nowrap'); break
    case 'flex-grow': if (val === '1' || val === 'auto') push('flex-grow'); else if (val === '0') push('flex-grow-0'); break
    case 'flex-shrink': if (val === '0') push('flex-shrink-0'); else if (val === '1') push('flex-shrink'); break
    case 'justify-content': {
      const m = { center: 'justify-center', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly', 'flex-start': 'justify-start', 'flex-end': 'justify-end', 'flex-end ':'justify-end' }
      if (m[val]) push(m[val]); break
    }
    case 'align-items': {
      const m = { center: 'items-center', 'flex-start': 'items-start', 'flex-end': 'items-end', stretch: 'items-stretch', baseline: 'items-baseline' }
      if (m[val]) push(m[val]); break
    }
    case 'align-self': {
      const m = { center: 'self-center', 'flex-start': 'self-start', 'flex-end': 'self-end', stretch: 'self-stretch' }
      if (m[val]) push(m[val]); break
    }
    case 'gap': { const px = remToNum(val); if (px != null) push(spacingUtil('gap', px)); break }
    case 'color': { const u = colorUtil('text', val); if (u) push(u); break }
    case 'background-color': { const u = colorUtil('bg', val); if (u) push(u); break }
    case 'background': {
      if (/gradient|url\(|rgba\(0, 0, 0, 0\)|no-repeat|image/i.test(val)) return null // 复杂背景留 <style>
      const u = colorUtil('bg', val); if (u) push(u); break
    }
    case 'font-size': { const px = remToNum(val); if (px != null) push(px % 4 === 0 ? `text-${px / 4}` : `text-[${px}px]`); break }
    case 'font-weight': {
      const m = { '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold', '700': 'font-bold', '800': 'font-extrabold', '300': 'font-light', 'normal': 'font-normal', 'bold': 'font-bold' }
      if (m[val]) push(m[val]); break
    }
    case 'font-style': if (val === 'italic') push('italic'); else if (val === 'normal') push('not-italic'); break
    case 'text-align': { const m = { center: 'text-center', left: 'text-left', right: 'text-right', justify: 'text-justify' }; if (m[val]) push(m[val]); break }
    case 'text-transform': { const m = { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize' }; if (m[val]) push(m[val]); break }
    case 'text-decoration': if (val.includes('underline')) push('underline'); else if (val === 'none') push('no-underline'); break
    case 'text-decoration-line': if (val.includes('underline')) push('underline'); break
    case 'line-height': {
      const px = remToNum(val); if (px != null) push(`leading-[${px}px]`)
      else if (/^\d/.test(val)) push(`leading-[${val}]`)
      break
    }
    case 'letter-spacing': { const px = remToNum(val); if (px != null) push(`tracking-[${px}px]`); break }
    case 'white-space': if (val === 'nowrap') push('whitespace-nowrap'); break
    case 'border': {
      // border: 1px solid #color
      const m = val.match(/(\d+)px\s+solid\s+(.+)/)
      if (m) { push('border'); const u = colorUtil('border', m[2]); if (u) push(u) }
      else if (val === 'none') push('border-0')
      break
    }
    case 'border-width': { const px = remToNum(val); if (px != null) push(px === 1 ? 'border' : `border-[${px}px]`) ; break }
    case 'border-style': if (val === 'solid') push('border-solid'); else if (val === 'dashed') push('border-dashed'); else if (val === 'none') push('border-0'); break
    case 'border-color': { const u = colorUtil('border', val); if (u) push(u); break }
    case 'border-radius': { const px = remToNum(val); if (px != null) push(radiusUtil(px)); else if (val === '50%') push('rounded-full'); break }
    case 'border-top-left-radius': case 'border-top-right-radius': case 'border-bottom-left-radius': case 'border-bottom-right-radius': {
      const px = remToNum(val); if (px != null) push(radiusUtil(px)); break
    }
    case 'box-shadow': push(`shadow-[${val.replace(/\s+/g, ' ').trim()}]`); break
    case 'opacity': { const n = parseFloat(val); if (!isNaN(n)) push(`opacity-[${val}]`); break }
    case 'cursor': { const m = { pointer: 'cursor-pointer', default: 'cursor-default' }; if (m[val]) push(m[val]); break }
    case 'z-index': { const n = parseInt(val, 10); if (!isNaN(n)) push(`z-[${n}]`); break }
    case 'top': case 'bottom': case 'left': case 'right': {
      if (val === '0') push(`${prop}-0`)
      else if (val === 'auto') push(`${prop}-auto`)
      else { const px = remToNum(val); if (px != null) push(px === 0 ? `${prop}-0` : spacingUtil(prop, px)) }
      break
    }
    case 'object-fit': if (val === 'cover') push('object-cover'); else if (val === 'contain') push('object-contain'); break
    case 'transition': return null // 动画留 <style>
    case 'transition-property': case 'transition-duration': case 'transition-timing-function': return null
    case 'transform': case 'transform-origin': return null
    default: return null
  }
  return out.length ? out : null
}

/* ----------------------- 自定义 CSS 规则解析 ----------------------- */
function parseCSS(css) {
  // 去掉注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  // 处理 @media / @keyframes / @supports 块：整体保留
  const preserved = []
  let i = 0
  while (i < css.length) {
    const at = css.indexOf('@', i)
    if (at === -1) break
    // 找到 @ 后的块
    let depth = 0, j = at
    // 跳过 @xxx 名称直到 {
    while (j < css.length && css[j] !== '{') j++
    if (j >= css.length) break
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') { depth--; if (depth === 0) { j++; break } }
    }
    preserved.push(css.slice(at, j).trim())
    // 把这段从 css 中移除（用占位）
    css = css.slice(0, at) + css.slice(j)
    i = at
  }
  // 解析普通规则
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = ruleRe.exec(css)) !== null) {
    const selector = m[1].trim()
    const body = m[2].trim()
    rules.push({ selector, body })
  }
  return { rules, preserved }
}

function translateCustomCSS(css) {
  const { rules, preserved } = parseCSS(css)
  const classToUtils = {}
  const leftover = []
  for (const { selector, body } of rules) {
    const decls = body.split(';').map((s) => s.trim()).filter(Boolean)
    // 复杂选择器（含 > + ~ , 空格后代 或 伪类/伪元素 或 非 .class 开头）→ 整体保留
    const isSimpleClass = /^[\w-]+$/.test(selector) || /^[\w-]+\s+[\w-]+$/.test(selector)
    const hasPseudo = /::|:(hover|focus|active|before|after|first-child|last-child|nth|checked|disabled)/.test(selector)
    if (!isSimpleClass || hasPseudo) {
      leftover.push(`${selector} { ${body} }`)
      continue
    }
    const classes = selector.split(/\s+/).filter((c) => c.startsWith('.'))
    if (classes.length === 0) { leftover.push(`${selector} { ${body} }`); continue }
    const targetClass = classes[classes.length - 1].slice(1)
    let utils = []
    let unmapped = []
    for (const d of decls) {
      const idx = d.indexOf(':')
      if (idx === -1) continue
      const prop = d.slice(0, idx).trim()
      const val = d.slice(idx + 1).trim()
      const u = translateDecl(prop, val)
      if (u) utils.push(...u)
      else unmapped.push(d)
    }
    if (utils.length) classToUtils[targetClass] = [...(classToUtils[targetClass] || []), ...utils]
    if (unmapped.length) {
      leftover.push(`.${targetClass} { ${unmapped.map((u) => u.endsWith(';') ? u : u + ';').join(' ')} }`)
    }
  }
  return { classToUtils, leftover: [...leftover, ...preserved] }
}

/* ----------------------- Bootstrap → Tailwind 映射 ----------------------- */
// 工具类（layout/spacing/flex/text/color/display）
const BS_UTIL = {
  'd-flex': 'flex', 'd-inline-flex': 'inline-flex', 'd-block': 'block', 'd-inline-block': 'inline-block',
  'd-grid': 'grid', 'd-none': 'hidden', 'd-inline': 'inline', 'd-table': 'table',
  'flex-row': 'flex-row', 'flex-column': 'flex-col', 'flex-row-reverse': 'flex-col-reverse', 'flex-column-reverse': 'flex-col-reverse',
  'flex-wrap': 'flex-wrap', 'flex-nowrap': 'flex-nowrap', 'flex-grow-1': 'flex-grow', 'flex-grow-0': 'flex-grow-0',
  'flex-shrink-0': 'flex-shrink-0', 'flex-shrink-1': 'flex-shrink',
  'justify-content-start': 'justify-start', 'justify-content-center': 'justify-center', 'justify-content-end': 'justify-end',
  'justify-content-between': 'justify-between', 'justify-content-around': 'justify-around', 'justify-content-evenly': 'justify-evenly',
  'align-items-start': 'items-start', 'align-items-center': 'items-center', 'align-items-end': 'items-end', 'align-items-stretch': 'items-stretch', 'align-items-baseline': 'items-baseline',
  'align-self-start': 'self-start', 'align-self-center': 'self-center', 'align-self-end': 'self-end',
  'text-center': 'text-center', 'text-start': 'text-left', 'text-end': 'text-right', 'text-justify': 'text-justify',
  'text-uppercase': 'uppercase', 'text-lowercase': 'lowercase', 'text-capitalize': 'capitalize',
  'fw-bold': 'font-bold', 'fw-semibold': 'font-semibold', 'fw-medium': 'font-medium', 'fw-light': 'font-light', 'fw-normal': 'font-normal',
  'fst-italic': 'italic', 'fst-normal': 'not-italic',
  'text-white': 'text-white', 'text-muted': 'text-gray-500', 'text-body': 'text-gray-800',
  'bg-transparent': 'bg-transparent', 'bg-white': 'bg-white', 'bg-light': 'bg-gray-100', 'bg-dark': 'bg-gray-900',
  'rounded': 'rounded', 'rounded-0': 'rounded-none', 'rounded-1': 'rounded-sm', 'rounded-2': 'rounded-md', 'rounded-3': 'rounded-lg', 'rounded-circle': 'rounded-full', 'rounded-pill': 'rounded-full',
  'border': 'border border-gray-200', 'border-0': 'border-0', 'border-top': 'border-t border-gray-200', 'border-bottom': 'border-b border-gray-200', 'border-start': 'border-l border-gray-200', 'border-end': 'border-r border-gray-200',
  'shadow': 'shadow', 'shadow-sm': 'shadow-sm', 'shadow-lg': 'shadow-lg', 'shadow-none': 'shadow-none',
  'position-relative': 'relative', 'position-absolute': 'absolute', 'position-fixed': 'fixed', 'position-static': 'static', 'position-sticky': 'sticky',
  'w-100': 'w-full', 'w-75': 'w-3/4', 'w-50': 'w-1/2', 'w-25': 'w-1/4', 'w-auto': 'w-auto', 'h-100': 'h-full', 'h-auto': 'h-auto', 'mw-100': 'max-w-full', 'mh-100': 'max-h-full',
  'overflow-hidden': 'overflow-hidden', 'overflow-auto': 'overflow-auto', 'visible': 'visible', 'invisible': 'invisible',
  'img-fluid': 'max-w-full h-auto', 'object-cover': 'object-cover',
  'text-truncate': 'truncate', 'text-break': 'break-words',
  'gap-0':'gap-0','gap-1':'gap-1','gap-2':'gap-2','gap-3':'gap-3','gap-4':'gap-4','gap-5':'gap-5',
}
// Bootstrap 语义色 → Tailwind（默认调色板，站点 :root 可覆盖）
const BS_COLOR = {
  primary: 'blue-600', secondary: 'gray-600', success: 'green-600', danger: 'red-600',
  warning: 'yellow-400', info: 'cyan-500', light: 'gray-100', dark: 'gray-900',
  'white': 'white', 'body': 'gray-800', 'muted': 'gray-500',
}
// 组件类 → Tailwind 工具类串
const BS_COMPONENT = {
  btn: 'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
  'btn-primary': 'bg-blue-600 text-white hover:bg-blue-700',
  'btn-secondary': 'bg-gray-600 text-white hover:bg-gray-700',
  'btn-success': 'bg-green-600 text-white hover:bg-green-700',
  'btn-danger': 'bg-red-600 text-white hover:bg-red-700',
  'btn-warning': 'bg-yellow-400 text-gray-900 hover:bg-yellow-500',
  'btn-info': 'bg-cyan-500 text-white hover:bg-cyan-600',
  'btn-light': 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  'btn-dark': 'bg-gray-900 text-white hover:bg-black',
  'btn-outline-primary': 'border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white',
  'btn-outline-secondary': 'border border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white',
  'btn-outline-light': 'border border-gray-300 text-gray-700 hover:bg-gray-100',
  'btn-outline-dark': 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
  'btn-sm': 'px-3 py-1.5 text-xs', 'btn-lg': 'px-5 py-2.5 text-base', 'btn-block': 'w-full',
  'btn-close': 'inline-flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-800 cursor-pointer',
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  'card-body': 'p-4', 'card-header': 'px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold', 'card-footer': 'px-4 py-3 bg-gray-50 border-t border-gray-200',
  'card-title': 'text-lg font-semibold mb-2', 'card-subtitle': 'text-sm text-gray-500 mb-2', 'card-text': 'text-gray-600',
  'card-img-top': 'w-full h-auto', 'card-img': 'w-full h-auto', 'card-link': 'text-blue-600 hover:underline',
  navbar: 'flex items-center', 'navbar-expand': 'flex', 'navbar-expand-sm': 'sm:flex', 'navbar-expand-md': 'md:flex', 'navbar-expand-lg': 'lg:flex', 'navbar-expand-xl': 'xl:flex', 'navbar-expand-xxl': 'xxl:flex', 'navbar-light': 'text-gray-700', 'navbar-dark': 'text-white bg-gray-900',
  'navbar-brand': 'text-xl font-bold no-underline', 'navbar-nav': 'flex flex-col lg:flex-row lg:items-center gap-1 list-none p-0 m-0',
  'nav-item': 'list-none', 'nav-link': 'px-3 py-2 rounded hover:bg-gray-100 no-underline block', 'nav-link.active': 'bg-gray-100',
  'navbar-toggler': 'inline-flex items-center p-2 border border-gray-300 rounded lg:hidden cursor-pointer',
  'navbar-toggler-icon': 'block w-5 h-5 bg-center bg-no-repeat',
  'navbar-collapse': 'flex-col lg:flex-row', 'collapse': 'hidden', 'collapse.show': '!block',
  'navbar-text': 'px-3 py-2',
  'list-group': 'flex flex-col list-none p-0 m-0', 'list-group-flush': 'border-0',
  'list-group-item': 'px-4 py-2 border-b border-gray-200 last:border-0 block no-underline',
  'list-group-item-action': 'hover:bg-gray-100 cursor-pointer', 'list-group-item-light': 'bg-gray-100', 'list-group-item-primary': 'bg-blue-50 text-blue-700', 'list-group-item-active': 'bg-blue-600 text-white',
  dropdown: 'relative', 'dropdown-menu': 'absolute z-10 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[10rem] hidden',
  'dropdown-menu.show': '!block', 'dropdown-menu-end': 'right-0', 'dropdown-item': 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 no-underline',
  'dropdown-divider': 'border-t border-gray-200 my-1', 'dropdown-header': 'px-4 py-2 text-xs font-semibold text-gray-500 uppercase',
  'dropdown-toggle': 'inline-flex items-center cursor-pointer',
  badge: 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
  'badge-primary': 'bg-blue-600 text-white', 'badge-secondary': 'bg-gray-600 text-white', 'badge-success': 'bg-green-600 text-white', 'badge-danger': 'bg-red-600 text-white', 'badge-warning': 'bg-yellow-400 text-gray-900', 'badge-light': 'bg-gray-100 text-gray-800', 'badge-dark': 'bg-gray-900 text-white',
  alert: 'p-4 rounded border', 'alert-primary': 'bg-blue-50 text-blue-800 border-blue-200', 'alert-success': 'bg-green-50 text-green-800 border-green-200', 'alert-danger': 'bg-red-50 text-red-800 border-red-200', 'alert-warning': 'bg-yellow-50 text-yellow-800 border-yellow-200', 'alert-info': 'bg-cyan-50 text-cyan-800 border-cyan-200', 'alert-dismissible': 'pr-10',
  'alert-link': 'font-semibold underline',
  table: 'w-full text-left border-collapse', 'table-striped': 'odd:bg-gray-50', 'table-bordered': 'border border-gray-200', 'table-hover': 'hover:bg-gray-50', 'table-sm': 'text-sm',
  'form-control': 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
  'form-select': 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
  'form-label': 'block mb-1 text-sm font-medium text-gray-700', 'form-text': 'text-xs text-gray-500', 'form-check': 'flex items-center gap-2', 'form-check-input': 'w-4 h-4', 'form-check-label': 'text-sm',
  'input-group': 'flex items-stretch', 'input-group-text': 'px-3 py-2 bg-gray-100 border border-gray-300 rounded-l',
  'container': 'mx-auto max-w-7xl px-4', 'container-fluid': 'w-full px-4', 'row': 'flex flex-wrap -mx-3',
  'col': 'flex-1 px-3', 'col-auto': 'px-3', 'gx-0': 'gap-x-0', 'gy-0': 'gap-y-0',
  'modal': 'fixed inset-0 z-50 hidden', 'modal.show': '!flex items-center justify-center', 'modal-dialog': 'bg-white rounded-lg shadow-xl max-w-lg w-full mx-4', 'modal-content': 'rounded-lg overflow-hidden', 'modal-header': 'px-4 py-3 border-b border-gray-200 flex items-center justify-between', 'modal-title': 'text-lg font-semibold', 'modal-body': 'p-4', 'modal-footer': 'px-4 py-3 border-t border-gray-200 flex justify-end gap-2',
  'breadcrumb': 'flex items-center gap-2 list-none p-0 m-0 text-sm', 'breadcrumb-item': 'text-gray-500', 'breadcrumb-item.active': 'text-gray-800',
  'pagination': 'flex items-center gap-1 list-none p-0 m-0', 'page-item': 'list-none', 'page-link': 'px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 no-underline',
  'progress': 'w-full h-4 bg-gray-200 rounded overflow-hidden', 'progress-bar': 'h-full bg-blue-600',
  'spinner-border': 'inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin',
  'lead': 'text-lg text-gray-600', 'small': 'text-sm', 'mark': 'bg-yellow-200',
  'text-reset': 'no-underline', 'stretched-link': 'after:absolute after:inset-0',
  'img-thumbnail': 'border border-gray-200 rounded p-1', 'figure': 'inline-block', 'figure-caption': 'text-sm text-gray-500',
  'btn-group': 'inline-flex', 'btn-group-vertical': 'inline-flex flex-col',
  'card-group': 'grid grid-cols-1 md:grid-cols-3 gap-4', 'card-deck': 'grid grid-cols-1 md:grid-cols-3 gap-4',
  'embed-responsive': 'relative overflow-hidden', 'embed-responsive-16by9': 'aspect-video',
}
// 颜色工具类（bg-/text- 语义色）
for (const [k, v] of Object.entries(BS_COLOR)) {
  BS_UTIL[`bg-${k}`] = `bg-${v}`
  BS_UTIL[`text-${k}`] = `text-${v}`
  BS_UTIL[`border-${k}`] = `border-${v}`
}
// 间距工具类动态生成（m-/p- 含 mt/mb/ml/mr/mx/my/pt...）
for (const side of ['', 't', 'b', 'l', 'r', 'x', 'y']) {
  for (let n = 0; n <= 5; n++) {
    const tw = n === 5 ? 12 : n // bs 5 = 3rem = tw 12
    BS_UTIL[`m${side}-${n}`] = `m${side}-${tw}`
    BS_UTIL[`p${side}-${n}`] = `p${side}-${tw}`
    if (n === 'auto') { BS_UTIL[`m${side}-auto`] = `m${side}-auto` }
  }
  BS_UTIL[`m${side}-auto`] = `m${side}-auto`
}
// gutter (Bootstrap row negative margins / col padding)
for (let n = 0; n <= 5; n++) {
    const tw = n === 5 ? 12 : n
    BS_UTIL[`ps-${n}`] = `pl-${tw}`; BS_UTIL[`pe-${n}`] = `pr-${tw}`
    BS_UTIL[`ms-${n}`] = `ml-${tw}`; BS_UTIL[`me-${n}`] = `mr-${tw}`
  }
// col-*, col-md-*, col-lg-* 网格
const COL_FRAC = { 1: '1/12', 2: '1/6', 3: '1/4', 4: '1/3', 5: '5/12', 6: '1/2', 7: '7/12', 8: '2/3', 9: '3/4', 10: '5/6', 11: '11/12', 12: 'full' }
for (const [n, frac] of Object.entries(COL_FRAC)) {
  BS_UTIL[`col-${n}`] = `w-${frac} px-3`
  BS_UTIL[`col-xs-${n}`] = `w-${frac} px-3`
  BS_UTIL[`col-sm-${n}`] = `sm:w-${frac} px-3`
  BS_UTIL[`col-md-${n}`] = `md:w-${frac} px-3`
  BS_UTIL[`col-lg-${n}`] = `lg:w-${frac} px-3`
  BS_UTIL[`col-xl-${n}`] = `xl:w-${frac} px-3`
  BS_UTIL[`col-xxl-${n}`] = `xxl:w-${frac} px-3`
}
BS_UTIL['col-12'] = 'w-full px-3'; BS_UTIL['gx-4'] = 'gap-x-4'; BS_UTIL['gx-5'] = 'gap-x-5'

/* ----------------------- HTML 改写 ----------------------- */
// 交互/结构标记类：即使有工具类映射也保留原类，供兜底 CSS / polyfill 定位
const PRESERVE = new Set(['dropdown-menu', 'dropdown', 'collapse', 'navbar-collapse', 'dropdown-item', 'dropdown-divider', 'dropdown-header', 'dropdown-toggle'])

function rewriteClass(full, classToUtils, unmappedLog) {
  const orig = full.replace(/^class\s*=\s*["']/, '').replace(/["']$/, '')
  const tokens = orig.split(/\s+/).filter(Boolean)
  const keep = []
  const utils = new Set()
  for (const t of tokens) {
    if (BS_UTIL[t]) { utils.add(BS_UTIL[t]); continue }
    if (BS_COMPONENT[t]) { utils.add(BS_COMPONENT[t]); if (PRESERVE.has(t)) keep.push(t); continue }
    if (classToUtils[t]) { classToUtils[t].forEach((u) => utils.add(u)); continue }
    // 未映射：保留原类（其样式可能来自遗留 <style>）
    keep.push(t)
    if (!/^[\w-]+$/.test(t)) unmappedLog.add(t)
  }
  // 去重（兼容重跑时已有工具类）
  const out = [...new Set([...keep, ...utils])].join(' ')
  return out
}

function extractBrandColors(html, cssText) {
  const colors = {}
  // 从 :root { --x: #yyy }
  const rootRe = /:root\s*\{([^}]*)\}/g
  let m
  while ((m = rootRe.exec(cssText)) !== null) {
    const body = m[1]
    const varRe = /(--[\w-]+)\s*:\s*([^;]+);/g
    let v
    while ((v = varRe.exec(body)) !== null) {
      const rawName = v[1].replace(/^--/, '')
      if (rawName.startsWith('bs-')) continue // 跳过 Bootstrap 自带变量噪声
      const name = rawName.replace(/[^a-zA-Z0-9]/g, '-')
      colors[name] = v[2].trim()
    }
  }
  return colors
}

/* ----------------------- 幂等剥离 ----------------------- */
function stripPrevInject(html) {
  // Tailwind Play CDN
  html = html.replace(/<script[^>]*src=["'][^"']*cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi, '')
  // tailwind.config 注入块
  html = html.replace(/<script[^>]*>[\s\S]*?tailwind\.config[\s\S]*?<\/script>/gi, '')
  // 上轮遗留 <style>（标记或旧注释特征）
  html = html.replace(/<style[^>]*data-tw-injected[^>]*>[\s\S]*?<\/style>/gi, '')
  html = html.replace(/<style[^>]*>[\s\S]*?遗留自定义样式[\s\S]*?<\/style>/gi, '')
  // 上轮 polyfill
  html = html.replace(/<script[^>]*data-tw-injected[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<script[^>]*>[\s\S]*?极简 Bootstrap 交互 polyfill[\s\S]*?<\/script>/gi, '')
  return html
}

/* ----------------------- 主流程 ----------------------- */
function isBootstrapCSS(text) {
  return /Bootstrap v\d|twbs\/bootstrap|getbootstrap\.com|bootstrap@\d/i.test(text)
}

// 递归收集站点下所有 html 文件（排除资源目录）
function collectHtmlFiles(dir) {
  const out = []
  const skipDirs = new Set(['assets', 'css', 'js', 'vendor', 'node_modules', 'images', 'img', 'fonts', 'font', 'static', 'libs'])
  function walk(d, depth) {
    if (depth > 4) return
    let ents
    try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) {
        if (skipDirs.has(e.name.toLowerCase())) continue
        walk(p, depth + 1)
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) {
        out.push(p)
      }
    }
  }
  walk(dir, 0)
  return out
}

// 解析单文件关联的本地 CSS（相对文件路径所在目录或 SITES_DIR）
function collectCssForFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8')
  const fileDir = path.dirname(filePath)
  const cssLinks = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
  let cssText = ''
  const localCssFiles = []
  for (const lm of cssLinks) {
    const href = lm[1]
    if (href.startsWith('http')) continue
    let cssPath
    if (href.startsWith('/static-sites/')) {
      cssPath = path.resolve(SITES_DIR, href.replace(/^\/static-sites\//, ''))
    } else {
      cssPath = path.resolve(fileDir, href)
    }
    if (fs.existsSync(cssPath)) {
      const txt = fs.readFileSync(cssPath, 'utf8')
      if (isBootstrapCSS(txt)) continue // 跳过整份 Bootstrap 源码，不翻译不保留
      cssText += '\n' + txt
      localCssFiles.push(cssPath)
    }
  }
  for (const cand of ['assets/css/main.css', 'assets/css/require.css', 'css/styles.css', 'assets/css/style.css', 'style.css']) {
    const p = path.resolve(fileDir, cand)
    if (fs.existsSync(p) && !localCssFiles.includes(p) && !isBootstrapCSS(fs.readFileSync(p, 'utf8'))) {
      cssText += '\n' + fs.readFileSync(p, 'utf8')
      localCssFiles.push(p)
    }
  }
  return { cssText, html }
}

function convertHtmlFile(filePath, _siteDir) {
  const { cssText, html: rawHtml } = collectCssForFile(filePath)
  const { classToUtils, leftover } = translateCustomCSS(cssText)
  const brand = extractBrandColors(rawHtml, cssText)
  const unmappedLog = new Set()

  let html = rawHtml.replace(/class\s*=\s*["']([^"']*)["']/gi, (full) => {
    const newAttr = rewriteClass(full, classToUtils, unmappedLog)
    return `class="${newAttr}"`
  })

  const leftoverCss = leftover.join('\n')
  const sidebarRule = html.includes('sidebar-wrapper')
    ? `\n/* 通用侧边栏折叠兜底（Start Bootstrap 系列 sb-sidenav-toggled） */\n#sidebar-wrapper{width:15rem;flex-shrink:0;transition:margin .25s ease}\nbody.sb-sidenav-toggled #sidebar-wrapper{margin-left:-15rem}\n`
    : ''
  const styleBlock = `<style data-tw-injected="1">\n/* 遗留自定义样式（无法用工具类表达的伪元素/动画/媒体查询/复杂选择器） */\n${leftoverCss}\n/* Bootstrap 组件交互兜底（无 Bootstrap JS 时） */\n.collapse:not(.show){display:none}\n.collapse.show{display:block}\n.navbar-collapse{display:none}\n.navbar-collapse.show{display:block}\n@media (min-width:992px){.navbar-collapse{display:flex!important;flex-direction:column}}\n.dropdown-menu:not(.show){display:none}\n.dropdown-menu.show{display:block}${sidebarRule}</style>`

  const brandEntries = Object.entries(brand).map(([k, v]) => `          '${k}': '${v}'`).join(',\n')
  const twConfig = brandEntries
    ? `\n<script data-tw-injected="1">window.tailwind = window.tailwind || {};tailwind.config = { theme: { extend: { colors: {\n${brandEntries}\n          } } } }};</script>\n`
    : ''
  const twInject = `<script data-tw-injected="1" src="https://cdn.tailwindcss.com"></script>${twConfig}`

  const polyfill = `<script data-tw-injected="1">
/* 极简 Bootstrap 交互 polyfill：复现 data-bs-toggle 的 collapse / dropdown 切换 */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-bs-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var kind = btn.getAttribute('data-bs-toggle');
      var targetSel = btn.getAttribute('data-bs-target');
      var target = targetSel ? document.querySelector(targetSel) : null;
      if (kind === 'dropdown') {
        var menu = btn.nextElementSibling;
        if (menu && (menu.classList.contains('dropdown-menu') || menu.tagName === 'DIV')) menu.classList.toggle('show');
      } else if (target) {
        target.classList.toggle('show');
      }
    });
  });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.dropdown-menu.show').forEach(function (m) {
      if (!m.parentElement.contains(e.target)) m.classList.remove('show');
    });
  });
});
</script>`

  // 1) 幂等剥离上一轮注入
  html = stripPrevInject(html)

  // 2) 移除 Bootstrap / 本地业务 CSS link
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']?stylesheet/i.test(tag)) return tag
    const hrefM = tag.match(/href=["']([^"']+)["']/i)
    const href = hrefM ? hrefM[1] : ''
    if (/bootstrap/i.test(href)) return '' // 移除 Bootstrap（CDN 或本地整份）
    if (/\.css(\?|#|$)/i.test(href)) {
      if (/fonts\.googleapis|ionicons|font-awesome|jsdelivr.*font|fontawesome/i.test(href)) return tag
      return '' // 移除本地业务 CSS（已翻译为工具类）
    }
    return tag
  })
  // 移除 Bootstrap JS
  html = html.replace(/<script[^>]*src=["'][^"']*bootstrap[^"']*["'][^>]*><\/script>/gi, '')

  // 3) 注入 Tailwind + 遗留样式 + polyfill
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${twInject}${styleBlock}\n</head>`)
  } else {
    html = twInject + styleBlock + html
  }
  if (html.includes('</body>')) html = html.replace('</body>', `${polyfill}\n</body>`)
  else html += polyfill

  fs.writeFileSync(filePath, html, 'utf8')
  return { classToUtils: Object.keys(classToUtils).length, leftover: leftover.length, brand: Object.keys(brand).length }
}

function convertSite(id) {
  const dir = path.join(SITES_DIR, String(id))
  if (!fs.existsSync(dir)) { console.log(`[skip] ${id}: no dir`); return }
  const bak = path.join(dir, 'index.original.html')
  const idx = path.join(dir, 'index.html')
  if (!fs.existsSync(bak) && fs.existsSync(idx)) fs.copyFileSync(idx, bak)

  const htmlFiles = collectHtmlFiles(dir)
  if (!htmlFiles.length) { console.log(`[skip] ${id}: no html files`); return }
  let tot = { classToUtils: 0, leftover: 0, brand: 0 }
  for (const hf of htmlFiles) {
    const r = convertHtmlFile(hf, dir)
    tot.classToUtils += r.classToUtils; tot.leftover += r.leftover; tot.brand += r.brand
  }
  console.log(`[done] ${id}: files=${htmlFiles.length}, classToUtils=${tot.classToUtils}, leftoverRules=${tot.leftover}, brandColors=${tot.brand}`)
}

/* ----------------------- 入口 ----------------------- */
const ids = process.argv.slice(2)
if (ids.length === 0) { console.error('用法: node convert-static-site-tailwind.mjs <dir> [dir ...]'); process.exit(1) }
let ok = 0, fail = 0
for (const id of ids) {
  try {
    convertSite(id)
    ok++
  } catch (e) {
    fail++
    console.error(`[ERROR] ${id}: ${e && e.message ? e.message : e}`)
  }
}
console.log(`批量转换完成。ok=${ok} fail=${fail}`)
