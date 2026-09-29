/**
 * 下载缺失的预览图
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGES_DIR = path.join(__dirname, '../../public/static-sites/images')
const DATA_FILE = path.join(__dirname, '../../public/static-sites/wegic-templates.json')

// 读取数据
const templatesData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))

async function downloadImage(imageUrl: string, outputPath: string): Promise<boolean> {
  try {
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `https://wegic.ai${imageUrl}`
    
    const response = await fetch(fullUrl)
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      fs.writeFileSync(outputPath, Buffer.from(buffer))
      return true
    }
  } catch (error) {
    console.error(`  下载失败: ${imageUrl}`)
  }
  return false
}

async function main() {
  console.log('🚀 开始下载缺失的预览图...')
  
  let downloadedCount = 0
  let skippedCount = 0
  
  for (const template of templatesData.templates) {
    const safeSlug = template.slug?.replace(/[^a-zA-Z0-9-]/g, '-') || 'template'
    const imageFileName = `${safeSlug}.jpg`
    const imagePath = path.join(IMAGES_DIR, imageFileName)
    
    // 检查图片是否已存在
    if (fs.existsSync(imagePath)) {
      console.log(`  ⏭️  已存在: ${imageFileName}`)
      skippedCount++
      continue
    }
    
    // 检查是否有原始图片URL
    if (!template.detail?.images || template.detail.images.length === 0) {
      console.log(`  ❌ 无图片URL: ${template.title}`)
      continue
    }
    
    // 尝试下载第一张图片
    const imageUrl = template.detail.images[0]
    const success = await downloadImage(imageUrl, imagePath)
    
    if (success) {
      downloadedCount++
      console.log(`  ✅ 已下载: ${imageFileName}`)
    } else {
      console.log(`  ❌ 下载失败: ${imageFileName}`)
    }
    
    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`\n📊 下载完成:`)
  console.log(`  ✅ 新下载: ${downloadedCount}`)
  console.log(`  ⏭️  已存在: ${skippedCount}`)
  console.log(`  📁 图片目录: ${IMAGES_DIR}`)
}

main().catch(console.error)
