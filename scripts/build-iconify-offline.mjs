#!/usr/bin/env node
/**
 * 构建期把项目实际用到的 Iconify 图标打进本地图标存储，消除运行时对
 * api.iconify.design 的依赖。
 *
 * 为什么需要：
 *   @iconify/vue 的 <Icon> 组件在本地存储里找不到图标时，会向 Iconify 公共 API
 *   发起网络请求。离线 / 内网 / 无外网的部署环境下图标会**全部空白**，同时首屏
 *   存在图标闪烁（FOUC）。本脚本扫描源码里的图标名，从 @iconify-json/* 集合中
 *   取出对应数据，生成 src/generated/iconify-offline.ts，在 main.ts 里以副作用
 *   导入执行 addCollection()。
 *
 * 用法：
 *   node scripts/build-iconify-offline.mjs            # 生成（默认）
 *   node scripts/build-iconify-offline.mjs --check    # 只校验是否最新，过期则退出码 1
 *
 * 安全网：
 *   - 扫描到某个前缀但没有安装对应的 @iconify-json 集合时，**报错退出**，
 *     而不是静默漏掉（否则该图标会在运行时变成网络请求或空白）。
 *   - 扫描到的图标名在集合中不存在时，**报错退出**（通常是拼写错误）。
 *   - --check 模式可用于 CI / pre-commit，防止生成物与源码漂移。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const OUT_FILE = path.join(SRC_DIR, 'generated', 'iconify-offline.ts')

/** 用于「识别」图标名的前缀白名单。识别到但未安装集合的前缀会报错，不会静默跳过。 */
const DETECT_PREFIXES = [
  'material-symbols', 'material-icons', 'lucide', 'mdi', 'ph', 'tabler', 'heroicons',
  'simple-icons', 'carbon', 'bi', 'ri', 'iconoir', 'fluent', 'fa6-solid', 'fa6-regular',
  'octicon', 'solar', 'mingcute', 'bx', 'gg', 'codicon', 'devicon', 'logos', 'noto',
]

const ICON_RE = /\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)\b/g

// ── 1. 扫描源码，收集图标名 ──────────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(vue|ts|mts|js|mjs)$/.test(entry.name)) out.push(full)
  }
  return out
}

const detectSet = new Set(DETECT_PREFIXES)
const usage = new Map() // 'prefix:name' -> Set('relpath:line')

for (const file of walk(SRC_DIR)) {
  const rel = path.relative(ROOT, file)
  // 生成物自身不参与扫描，避免自引用
  if (path.resolve(file) === OUT_FILE) continue
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    ICON_RE.lastIndex = 0
    let m
    while ((m = ICON_RE.exec(line))) {
      if (!detectSet.has(m[1])) continue
      const key = `${m[1]}:${m[2]}`
      if (!usage.has(key)) usage.set(key, new Set())
      usage.get(key).add(`${rel}:${i + 1}`)
    }
  })
}

if (usage.size === 0) {
  console.error('[iconify-offline] 未扫描到任何图标名，疑似扫描范围配置错误，已中止。')
  process.exit(1)
}

// ── 2. 按前缀分组，加载对应集合 ──────────────────────────────────────────

const byPrefix = new Map()
for (const key of [...usage.keys()].sort()) {
  const prefix = key.slice(0, key.indexOf(':'))
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
  byPrefix.get(prefix).push(key.slice(key.indexOf(':') + 1))
}

const errors = []
const collections = []

for (const [prefix, ids] of byPrefix) {
  let json
  try {
    json = require(`@iconify-json/${prefix}/icons.json`)
  } catch {
    errors.push(
      `前缀 "${prefix}" 有 ${ids.length} 个图标在用，但未安装 @iconify-json/${prefix}。\n` +
        `  请执行：npm install -D @iconify-json/${prefix}\n` +
        `  涉及位置：${ids.slice(0, 3).map((id) => [...usage.get(`${prefix}:${id}`)][0]).join(', ')}`
    )
    continue
  }

  // 解析图标：icon 直接取；alias 需要沿 parent 链回溯到真正的 icon
  const icons = {}
  const aliases = {}

  const resolveAliasParent = (id, seen = new Set()) => {
    if (seen.has(id)) return null
    seen.add(id)
    const alias = json.aliases?.[id]
    if (!alias) return json.icons[id] ? id : null
    const parent = alias.parent
    if (json.icons[parent]) return parent
    return resolveAliasParent(parent, seen)
  }

  for (const id of ids) {
    if (json.icons[id]) {
      icons[id] = json.icons[id]
      continue
    }
    if (json.aliases?.[id]) {
      const parent = resolveAliasParent(id)
      if (!parent) {
        errors.push(`图标 "${prefix}:${id}" 是别名，但其 parent 链无法解析到实际图标。`)
        continue
      }
      // 同时带上 parent 本体与别名定义
      icons[parent] = json.icons[parent]
      aliases[id] = { ...json.aliases[id], parent }
      continue
    }
    errors.push(
      `图标 "${prefix}:${id}" 在 @iconify-json/${prefix} 中不存在（拼写错误？）。\n` +
        `  涉及位置：${[...usage.get(`${prefix}:${id}`)].join(', ')}`
    )
  }

  if (Object.keys(icons).length === 0) continue

  collections.push({
    prefix,
    icons,
    aliases,
    width: json.width ?? 24,
    height: json.height ?? 24,
  })
}

if (errors.length) {
  console.error('\n[iconify-offline] 生成失败：\n')
  for (const e of errors) console.error('  ✗ ' + e + '\n')
  process.exit(1)
}

// ── 3. 生成 TS 文件（键序稳定，保证 --check 可复现） ─────────────────────

/**
 * 确定性序列化。
 * 注意：不能用 JSON.stringify(obj, keysArray, 1) —— 数组形式的 replacer 会过滤
 * **所有层级**的键，图标数据里的 body 会被静默吃掉。这里改为显式递归排序键。
 */
function stableStringify(value, indent = 1) {
  const pad = (n) => ' '.repeat(indent * n)
  const walk = (v, depth) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v)
    if (Array.isArray(v)) {
      if (v.length === 0) return '[]'
      return '[\n' + v.map((x) => pad(depth + 1) + walk(x, depth + 1)).join(',\n') + '\n' + pad(depth) + ']'
    }
    const keys = Object.keys(v).sort()
    if (keys.length === 0) return '{}'
    return (
      '{\n' +
      keys.map((k) => pad(depth + 1) + JSON.stringify(k) + ': ' + walk(v[k], depth + 1)).join(',\n') +
      '\n' +
      pad(depth) +
      '}'
    )
  }
  return walk(value, 0)
}

const banner = `/* eslint-disable */
/**
 * 本文件由 scripts/build-iconify-offline.mjs 自动生成，请勿手工编辑。
 * 重新生成：npm run icons:build
 *
 * 作用：把项目实际用到的 ${usage.size} 个 Iconify 图标在构建期注入本地图标存储，
 * 使 <Icon> 解析完全离线——不再依赖 api.iconify.design，也不再有图标闪烁。
 * 若新增图标后忘记重新生成，npm run icons:check 会失败。
 */
import { addCollection } from '@iconify/vue'

type Collection = Parameters<typeof addCollection>[0]

/** 源码中扫描到的全部图标名，供单测校验本地存储能否解析（防止离线时静默空白）。 */
export const ICON_NAMES: string[] = [
${[...usage.keys()].sort().map((n) => `  ${JSON.stringify(n)},`).join('\n')}
]
`

const body = collections
  .map((c) => {
    const payload = {
      prefix: c.prefix,
      width: c.width,
      height: c.height,
      icons: c.icons,
      ...(Object.keys(c.aliases).length ? { aliases: c.aliases } : {}),
    }
    return `\n// ${c.prefix} — ${Object.keys(c.icons).length} 个图标\naddCollection(${stableStringify(payload)} as Collection)\n`
  })
  .join('')

const output = banner + body
const isCheck = process.argv.includes('--check')
const existing = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null

if (isCheck) {
  if (existing === output) {
    console.log(`[iconify-offline] 已是最新（${usage.size} 个图标，${collections.length} 个集合）。`)
    process.exit(0)
  }
  console.error(
    '[iconify-offline] 生成物与源码不一致，请执行 npm run icons:build 后重新提交。\n' +
      `  源码扫描到 ${usage.size} 个图标；${existing === null ? '生成文件不存在' : '生成文件内容不同'}。`
  )
  process.exit(1)
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, output)

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
console.log('[iconify-offline] 已生成 ' + path.relative(ROOT, OUT_FILE))
for (const c of collections) {
  console.log(`  · ${c.prefix.padEnd(18)} ${String(Object.keys(c.icons).length).padStart(3)} 个图标`)
}
console.log(`  合计 ${usage.size} 个图标引用，文件 ${kb(Buffer.byteLength(output))}`)
