/**
 * 导入 Wegic 模版数据到数据库
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface WegicTemplate {
  title: string
  slug: string
  imageUrl: string
  url: string
  detail?: {
    description?: string
    features?: string[]
  }
}

interface WegicTemplatesData {
  totalTemplates: number
  templates: WegicTemplate[]
}

// 读取抓取的模版数据
const dataFile = path.join(__dirname, '../../public/static-sites/wegic-templates.json')
const templatesData = JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as WegicTemplatesData

console.log(`📊 开始导入 ${templatesData.totalTemplates} 个模版到数据库...`)

// 构建导入数据
const importData = templatesData.templates.map((template) => {
  return {
    title: template.title,
    description: template.detail?.description || null,
    slug: template.slug,
    category: 'wegic-template', // 使用统一分类
    tags: template.detail?.features || [],
    thumbnail: template.imageUrl,
    entryUrl: template.url,
    pages: [],
    pageCount: 0,
    assetCount: 0,
    externalDeps: [],
    difficulty: 'intermediate' as const,
    isPublished: true,
    sourceDirectory: null
  }
})

console.log(`\n📋 准备导入的数据:`)
console.log(JSON.stringify(importData, null, 2))

// 生成 curl 命令
console.log(`\n🔧 生成导入命令...`)

importData.forEach((item, index) => {
  const curlCmd = `curl -X POST http://localhost:5555/api/static-sites \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(item)}'`
  
  console.log(`\n# 导入 ${index + 1}/${importData.length}: ${item.title}`)
  console.log(curlCmd)
})

console.log(`\n✅ 请运行上述 curl 命令导入数据，或使用以下脚本:`)

// 生成可直接执行的脚本
const scriptContent = `#!/bin/bash
# 自动导入 Wegic 模版数据到数据库

${importData.map((item, index) => {
  return `# ${index + 1}. ${item.title}
curl -X POST http://localhost:5555/api/static-sites \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(item)}'

echo "✅ 已导入: ${item.title}"
sleep 0.5`;
}).join('\n\n')}

echo "🎉 所有数据导入完成!"
`

const scriptFile = path.join(__dirname, 'import-to-db.sh')
fs.writeFileSync(scriptFile, scriptContent)
fs.chmodSync(scriptFile, '755')

console.log(`\n📁 脚本已保存到: ${scriptFile}`)
console.log(`💡 运行方式: bash ${scriptFile}`)

// 同时生成一个 TypeScript 版本用于直接调用 API
const tsContent = `
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function importToDatabase() {
  const dataFile = path.join(__dirname, '../../public/static-sites/wegic-templates.json')
  const templatesData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  
  console.log(\`🚀 开始导入 \${templatesData.totalTemplates} 个模版到数据库...\`)
  
  for (const template of templatesData.templates) {
    const data = {
      title: template.title,
      description: template.detail?.description || null,
      slug: template.slug,
      category: 'wegic-template',
      tags: template.detail?.features || [],
      thumbnail: template.imageUrl,
      entryUrl: template.url,
      pages: [],
      pageCount: 0,
      assetCount: 0,
      externalDeps: [],
      difficulty: 'intermediate',
      isPublished: true,
      sourceDirectory: null
    }
    
    try {
      const response = await fetch('http://localhost:5555/api/static-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        console.log(\`✅ 已导入: \${template.title}\`)
      } else {
        console.error(\`❌ 导入失败: \${template.title}\`)
      }
    } catch (error) {
      console.error(\`❌ 导入失败: \${template.title}\`, error)
    }
    
    // 等待一小段时间避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('🎉 所有数据导入完成!')
}

importToDatabase().catch(console.error)
`

const tsFile = path.join(__dirname, 'import-to-db.ts')
fs.writeFileSync(tsFile, tsContent)

console.log(`📁 TypeScript 脚本已保存到: ${tsFile}`)
console.log(`💡 运行方式: npx tsx scripts/import-to-db.ts`)
