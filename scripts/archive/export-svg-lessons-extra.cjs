/**
 * 定向导出「缺失的 SVG 课程元数据」到本地前端配置。
 *
 * 不覆盖现有 src/config/svgLessons.ts（保留已登记的 357 条），
 * 仅把后端 ui_visual_demos 中「library='lessons' 且本地 config 未登记」、
 * 且磁盘 src/views/svg-lessons/<id>.vue 真实存在的课程，
 * 落地为 src/config/svgLessonsExtra.ts。
 *
 * 这样前端 SVG 课程（含详情页）可完全不依赖后端渲染。
 *
 * 运行：node scripts/export-svg-lessons-extra.cjs
 */
const fs = require('fs')
const path = require('path')
const { Client } = require(path.join(__dirname, '../server/node_modules/pg'))

// ── 读取 server/.env（忽略可能被污染的 process.env，以 .env 为准） ──
function loadEnv() {
  const envPath = path.join(__dirname, 'server', '.env')
  const cfg = {}
  if (fs.existsSync(envPath)) {
    const txt = fs.readFileSync(envPath, 'utf-8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) cfg[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return cfg
}
const ENV = loadEnv()

const CONFIG_PATH = path.join(__dirname, '..', 'src/config/svgLessons.ts')
const OUT_PATH = path.join(__dirname, '..', 'src/config/svgLessonsExtra.ts')
const SVG_DIR = path.join(__dirname, '..', 'src/views/svg-lessons')

// idToFileName 与 svgLessons.ts 中的 lessonIdToFileName 保持一致
function idToFileName(id) {
  return id
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

// ── 解析现有 config 已登记的 id ──
function existingIds() {
  const txt = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const ids = new Set()
  const re = /id:\s*"([^"]+)"/g
  let m
  while ((m = re.exec(txt))) ids.add(m[1])
  return ids
}

function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\r/g, ' ')
}

async function main() {
  const client = new Client({
    host: ENV.DB_HOST || 'localhost',
    port: parseInt(ENV.DB_PORT || '5432', 10),
    user: ENV.DB_USERNAME || 'root',
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME || 'html5_examples',
  })
  await client.connect()
  console.log('✓ 数据库连接成功')

  const rows = await client.query(`
    SELECT id, title, description, engine, "group", chapter,
           group_order, chapter_order, sort_order, difficulty, tags, html_code
    FROM ui_visual_demos
    WHERE library = 'lessons' AND status = 'published'
    ORDER BY group_order ASC, chapter_order ASC, sort_order ASC, id ASC
  `)
  console.log(`✓ 查询到 ${rows.rowCount} 条 lessons 记录`)

  const have = existingIds()
  console.log(`✓ 本地 config 已登记 ${have.size} 条`)

  const extra = []
  let skippedNoFile = 0
  let skippedExists = 0
  for (const r of rows.rows) {
    if (have.has(r.id)) {
      skippedExists++
      continue
    }
    const fileName = `${idToFileName(r.id)}.vue`
    const filePath = path.join(SVG_DIR, fileName)
    if (!fs.existsSync(filePath)) {
      skippedNoFile++
      console.warn(`  ✗ 跳过 ${r.id}：磁盘缺少 ${fileName}`)
      continue
    }
    const tags = Array.isArray(r.tags) ? r.tags : []
    extra.push({
      id: r.id,
      title: r.title || r.id,
      description: r.description || '',
      engine: r.engine || 'svg',
      group: r.group || '未分组',
      chapter: r.chapter || '',
      groupOrder: Number(r.group_order) || 0,
      chapterOrder: Number(r.chapter_order) || 0,
      sortOrder: Number(r.sort_order) || 0,
      difficulty: r.difficulty || 'intermediate',
      tags,
      htmlCode: r.html_code || '',
    })
  }
  console.log(`✓ 新增 ${extra.length} 条；已登记跳过 ${skippedExists}；磁盘缺失跳过 ${skippedNoFile}`)

  // ── 生成 TS 文件 ──
  const lines = []
  lines.push(`/**
 * SVG 互动课程 — 本地"补录"元数据
 * 由 scripts/export-svg-lessons-extra.cjs 从后端 ui_visual_demos 生成。
 * 仅包含 src/config/svgLessons.ts 未登记、但磁盘 .vue 已存在的课程。
 * 与 svgLessons.ts 合并后，前端 SVG 课程可完全不依赖后端渲染。
 */`)
  lines.push('')
  lines.push(`import { svgLessons, svgLessonGroups, svgLessonEngines } from './svgLessons'`)
  lines.push(`import type { SvgLesson } from './svgLessons'`)
  lines.push('')
  lines.push(`/** 补录课程的元数据（含可选 htmlCode 备用预览） */`)
  lines.push(`export interface SvgLessonMeta extends SvgLesson {`)
  lines.push(`  htmlCode?: string`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export const svgLessonsExtra: SvgLessonMeta[] = [`)
  for (const m of extra) {
    const tags = JSON.stringify(m.tags)
    lines.push(`  {`)
    lines.push(`    id: '${m.id}',`)
    lines.push(`    title: '${esc(m.title)}',`)
    lines.push(`    description: '${esc(m.description)}',`)
    lines.push(`    engine: '${esc(m.engine)}',`)
    lines.push(`    group: '${esc(m.group)}',`)
    lines.push(`    chapter: '${esc(m.chapter)}',`)
    lines.push(`    groupOrder: ${m.groupOrder},`)
    lines.push(`    chapterOrder: ${m.chapterOrder},`)
    lines.push(`    sortOrder: ${m.sortOrder},`)
    lines.push(`    difficulty: '${esc(m.difficulty)}',`)
    lines.push(`    tags: ${tags},`)
    if (m.htmlCode) lines.push(`    htmlCode: ${JSON.stringify(m.htmlCode)},`)
    lines.push(`  },`)
  }
  lines.push(`]`)
  lines.push('')
  lines.push(`// ── 合并：现有 357 + 补录，按 id 去重（补录优先） ──`)
  lines.push(`const mergedMap = new Map<string, SvgLessonMeta>()`)
  lines.push(`for (const l of svgLessons) mergedMap.set(l.id, l)`)
  lines.push(`for (const l of svgLessonsExtra) mergedMap.set(l.id, l)`)
  lines.push('')
  lines.push(`export const allSvgLessons: SvgLessonMeta[] = [...mergedMap.values()]`)
  lines.push(`export const allSvgLessonsMap = new Map(allSvgLessons.map((l) => [l.id, l]))`)
  lines.push(`export const allSvgLessonGroups: string[] = [...new Set(allSvgLessons.map((l) => l.group))]`)
  lines.push(`export const allSvgLessonEngines: string[] = [...new Set(allSvgLessons.map((l) => l.engine))]`)
  lines.push('')

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8')
  console.log(`✓ 已生成 ${OUT_PATH}（${extra.length} 条补录）`)

  await client.end()
  console.log('✓ 完成')
}

main().catch((err) => {
  console.error('导出失败:', err)
  process.exit(1)
})
