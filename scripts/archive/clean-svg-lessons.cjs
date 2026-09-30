/**
 * SVG 课程内容清洗脚本
 * 移除同质化、低质量、损坏预览的示例
 *
 * 运行：node scripts/clean-svg-lessons.js
 */
const fs = require('fs')
const path = require('path')

const configPath = path.resolve(__dirname, '../src/config/svgLessons.ts')
const content = fs.readFileSync(configPath, 'utf-8')
const match = content.match(/export const svgLessons: SvgLesson\[\] = (\[[\s\S]*?\n\])/)
if (!match) { console.error('Parse failed'); process.exit(1) }
const data = eval(match[1])

console.log(`原始数量: ${data.length}`)

// ─── 移除规则 ───────────────────────────────────────────────────────────────

const removeIds = new Set()

// 1. 整个 feColorMatrix 分组（19项）— 全部预览损坏，且只是同一滤镜的参数变体
data.filter(d => d.group === 'SVG 滤镜 / feColorMatrix').forEach(d => removeIds.add(d.id))

// 2. Ch06 ViewBox — 移除重复/低质量的，保留4个有代表性的
const ch06Keep = new Set([
  'svg-book-ch06-view-box-offsets-demo',
  'svg-book-ch06-view-box-origin-demo',
  'svg-book-ch06-square-coordinate-art',
  'svg-book-ch06-wide-coordinate-art',
])
data.filter(d => d.group === '第 6 章 ViewBox 与坐标系' && !ch06Keep.has(d.id))
  .forEach(d => removeIds.add(d.id))

// 3. Ch07 Playgrounds — 移除7个单一形状 playground（保留 Basic Shape + Range）
const ch07PlaygroundRemove = [
  'svg-book-ch07-circle-playground-demo',
  'svg-book-ch07-ellipse-playground-demo',
  'svg-book-ch07-line-playground-demo',
  'svg-book-ch07-polygon-playground-demo',
  'svg-book-ch07-polyline-playground-demo',
  'svg-book-ch07-rect-playground-demo',
  'svg-book-ch07-rounded-rect-playground-demo',
]
ch07PlaygroundRemove.forEach(id => removeIds.add(id))

// 4. 下划线前缀标题（未清理的文件名）
data.filter(d => d.title.startsWith('_')).forEach(d => removeIds.add(d.id))

// 5. 标题含 .vue 扩展名（原始文件名未处理）
data.filter(d => d.title.endsWith('.vue')).forEach(d => removeIds.add(d.id))

// 6. 单条目分组 — 整组移除
const groupCounts = {}
data.forEach(d => { groupCounts[d.group] = (groupCounts[d.group] || 0) + 1 })
Object.entries(groupCounts).filter(([_, count]) => count === 1)
  .forEach(([group]) => {
    data.filter(d => d.group === group).forEach(d => removeIds.add(d.id))
  })

// 7. 重复聚类 — 每组保留前2个，移除其余
const duplicateClusters = [
  // Svg Duotone 系列（保留2个）
  ['svg-book-ch38-svg-duotone-blend-demo', 'svg-book-ch38-svg-duotone-css-demo',
   'svg-book-ch38-svg-duotone-filter-demo', 'svg-book-ch38-svg-duotone-glitch-demo',
   'svg-book-ch38-svg-duotone-reverse-demo'],
  // Svg Pseudo 3d 系列（保留2个）
  ['svg-book-ch18-svg-pseudo3-d-depth-demo', 'svg-book-ch18-svg-pseudo3-d-intro-demo',
   'svg-book-ch18-svg-pseudo3-d-rotate-demo', 'svg-book-ch18-svg-pseudo3-d-rotate-variant-demo',
   'svg-book-ch18-svg-pseudo3-d-variant-demo'],
  // Svg Fe Blend 系列（保留2个）
  ['svg-book-ch44-svg-fe-blend-gradient-demo', 'svg-book-ch44-svg-fe-blend-image-demo',
   'svg-book-ch44-svg-fe-blend-interactive-demo', 'svg-book-ch44-svg-fe-blend-multiple-demo',
   'svg-book-ch44-svg-fe-blend-text-demo'],
  // Preserve Aspect Ratio 重复（保留1个）
  ['svg-book-ch06-preserve-aspect-ratio-aspect-ratio-demo',
   'svg-book-ch06-preserve-aspect-ratio-aspect-ratio-repeat-demo',
   'svg-book-ch06-preserve-aspect-ratio-basic-demo'],
  // Viewport/Aspect Ratio 重复
  ['svg-book-ch06-aspect-ratio-mismatch-demo',
   'svg-book-ch06-viewport-aspect-ratio-mismatch-demo'],
  // Christmas Ornament 重复
  ['svg-book-ch07-christmas-ornament-clip-demo', 'svg-book-ch07-christmas-ornament-demo',
   'svg-book-ch07-ornament-clip-path-demo'],
  // Coordinate Systems 重复
  ['svg-book-ch06-coordinate-systems-playground-demo',
   'svg-book-ch06-coordinate-systems-workbench-demo'],
  // Viewport Equals/Larger/Smaller 三选一
  ['svg-book-ch06-viewport-equals-view-box-demo',
   'svg-book-ch06-viewport-larger-than-view-box-demo',
   'svg-book-ch06-viewport-smaller-than-view-box-demo'],
]

duplicateClusters.forEach(cluster => {
  // 保留前2个（或前1个如果cluster标记），移除其余
  const keepCount = cluster.length <= 3 ? 1 : 2
  cluster.slice(keepCount).forEach(id => removeIds.add(id))
})

// 8. Ch09 中重复的 image playground / comparison
const ch09Remove = [
  'svg-book-ch09-css-object-fit-playground-demo',
  'svg-book-ch09-svg-image-contain-comparison-demo',
  'svg-book-ch09-svg-image-view-box-playground-demo',
]
ch09Remove.forEach(id => removeIds.add(id))

// 9. 移除纯英文长标题中明显是文件名/测试名的（All XXX Demo 模式）
data.filter(d => /^All\s+\w+/.test(d.title) && d.title.includes('Demo'))
  .forEach(d => removeIds.add(d.id))

// ─── 执行移除 ───────────────────────────────────────────────────────────────

const cleaned = data.filter(d => !removeIds.has(d.id))
console.log(`移除数量: ${removeIds.size}`)
console.log(`清洗后数量: ${cleaned.length}`)

// 统计移除的分组分布
const removedByGroup = {}
data.filter(d => removeIds.has(d.id)).forEach(d => {
  removedByGroup[d.group] = (removedByGroup[d.group] || 0) + 1
})
console.log('\n按分组统计移除:')
Object.entries(removedByGroup).sort((a, b) => b[1] - a[1]).forEach(([g, c]) => {
  console.log(`  ${g}: -${c}`)
})

// ─── 重新生成配置文件 ───────────────────────────────────────────────────────

const groups = [...new Set(cleaned.map(l => l.group))]

const lines = []
lines.push(`/**`)
lines.push(` * SVG 互动课程 — 本地元数据配置`)
lines.push(` * 由 server/scripts/export-svg-lessons.ts 生成，经 scripts/clean-svg-lessons.js 清洗`)
lines.push(` */`)
lines.push('')
lines.push(`export interface SvgLesson {`)
lines.push(`  id: string`)
lines.push(`  title: string`)
lines.push(`  description: string`)
lines.push(`  engine: string`)
lines.push(`  group: string`)
lines.push(`  chapter: string`)
lines.push(`  groupOrder: number`)
lines.push(`  chapterOrder: number`)
lines.push(`  sortOrder: number`)
lines.push(`  difficulty: string`)
lines.push(`  tags: string[]`)
lines.push(`}`)
lines.push('')
lines.push(`export const svgLessons: SvgLesson[] = [`)

for (const meta of cleaned) {
  const tags = JSON.stringify(meta.tags)
  const desc = meta.description.replace(/'/g, "\\'").replace(/\n/g, ' ')
  const title = meta.title.replace(/'/g, "\\'")
  const group = meta.group.replace(/'/g, "\\'")
  const chapter = meta.chapter.replace(/'/g, "\\'")
  lines.push(`  {`)
  lines.push(`    id: '${meta.id}',`)
  lines.push(`    title: '${title}',`)
  lines.push(`    description: '${desc}',`)
  lines.push(`    engine: '${meta.engine}',`)
  lines.push(`    group: '${group}',`)
  lines.push(`    chapter: '${chapter}',`)
  lines.push(`    groupOrder: ${meta.groupOrder},`)
  lines.push(`    chapterOrder: ${meta.chapterOrder},`)
  lines.push(`    sortOrder: ${meta.sortOrder},`)
  lines.push(`    difficulty: '${meta.difficulty}',`)
  lines.push(`    tags: ${tags},`)
  lines.push(`  },`)
}

lines.push(`]`)
lines.push('')
lines.push(`/** 所有分组（去重 + 保持原始排序） */`)
lines.push(`export const svgLessonGroups: string[] = [...new Set(svgLessons.map((l) => l.group))]`)
lines.push('')
lines.push(`/** 所有引擎类型 */`)
lines.push(`export const svgLessonEngines: string[] = [...new Set(svgLessons.map((l) => l.engine))]`)
lines.push('')
lines.push(`/** id → 组件文件名映射 */`)
lines.push(`export function lessonIdToFileName(id: string): string {`)
lines.push(`  return id`)
lines.push(`    .split(/[-_]/)`)
lines.push(`    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))`)
lines.push(`    .join('')`)
lines.push(`}`)
lines.push('')

fs.writeFileSync(configPath, lines.join('\n'), 'utf-8')
console.log(`\n✓ 配置文件已更新: ${configPath}`)
console.log(`✓ 分组数: ${groups.length} → ${[...new Set(cleaned.map(l => l.group))].length}`)
