/**
 * Wegic.ai Templates Scraper - 最终版 v2
 * 支持滚动加载所有模版
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const OUTPUT_DIR = path.join(__dirname, '../../public/static-sites')
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images')
const DATA_FILE = path.join(OUTPUT_DIR, 'wegic-templates.json')
const DETAILS_DIR = path.join(OUTPUT_DIR, 'details')

// 确保目录存在
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
}
if (!fs.existsSync(DETAILS_DIR)) {
  fs.mkdirSync(DETAILS_DIR, { recursive: true })
}

// 等待函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 下载图片
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

// 主函数
async function main() {
  console.log('🚀 开始抓取 Wegic.ai 模版...')
  console.log(`📁 输出目录: ${OUTPUT_DIR}`)

  // 启动浏览器
  console.log('\n🌐 启动浏览器...')
  const browser = await chromium.launch({
    headless: true,
    slowMo: 50
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })

  const page = await context.newPage()

  try {
    // 访问模版页面
    console.log('📱 打开模版页面...')
    await page.goto('https://wegic.ai/templates', {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    // 等待页面初始加载
    await sleep(5000)

    // 通过滚动加载所有内容
    console.log('\n📜 滚动页面加载所有模版...')
    let previousHeight = 0
    let currentHeight = await page.evaluate(() => document.body.scrollHeight)
    let scrollCount = 0
    const maxScrolls = 100
    let previousTemplateCount = 0
    let sameCountAttempts = 0

    while (scrollCount < maxScrolls) {
      // 获取当前模版数量
      const currentTemplateCount = await page.evaluate(() => {
        return document.querySelectorAll('a[href^="/templates/"]').length
      })
      
      console.log(`  滚动 ${scrollCount + 1}: 页面高度 ${previousHeight} -> ${currentHeight}, 模版数: ${currentTemplateCount}`)

      // 检查是否没有新内容了
      if (currentTemplateCount === previousTemplateCount) {
        sameCountAttempts++
        if (sameCountAttempts >= 5) {
          console.log('✅ 连续 5 次没有新内容，页面已完全加载')
          break
        }
      } else {
        sameCountAttempts = 0
        previousTemplateCount = currentTemplateCount
      }

      // 滚动到底部
      previousHeight = currentHeight
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      
      // 等待加载（保守慢速：3-5秒）
      const waitTime = 3000 + Math.random() * 2000
      await sleep(waitTime)
      
      currentHeight = await page.evaluate(() => document.body.scrollHeight)
      scrollCount++

      // 每10次滚动后额外等待
      if (scrollCount % 10 === 0) {
        console.log('⏸️  额外等待 5 秒（防封策略）...')
        await sleep(5000)
      }
    }

    console.log(`\n📊 共滚动了 ${scrollCount} 次`)

    // 提取所有模版数据
    console.log('\n🔍 提取模版数据...')
    const templates = await page.evaluate(() => {
      const results: Array<{
        title: string
        url: string | null
        imageUrl: string | null
        slug: string | null
      }> = []

      // 查找所有模版链接
      const allLinks = document.querySelectorAll('a[href^="/templates/"]')
      const processedUrls = new Set<string>()

      allLinks.forEach(link => {
        const href = link.getAttribute('href')
        if (!href) return

        // 排除搜索链接
        if (href.includes('/templates/search/') || href === '/templates') {
          return
        }

        // 避免重复
        if (processedUrls.has(href)) {
          return
        }
        processedUrls.add(href)

        // 获取标题
        let title: string | null = null
        
        // 方法1: 从 img alt 获取
        const img = link.querySelector('img')
        if (img) {
          title = img.getAttribute('alt')
        }
        
        // 方法2: 从链接文本获取
        if (!title) {
          title = link.textContent?.trim() || null
        }

        if (!title || title.length < 3) {
          return
        }

        // 获取图片
        const imageUrl = img?.getAttribute('src') || null

        // 提取 slug
        const slug = href.replace('/templates/', '').replace(/^\//, '')

        results.push({
          title,
          url: href.startsWith('http') ? href : `https://wegic.ai${href}`,
          imageUrl,
          slug
        })
      })

      return results
    })

    console.log(`📊 找到 ${templates.length} 个模版`)

    // 去重
    const uniqueTemplates = templates.filter((template, index, self) =>
      index === self.findIndex(t => t.url === template.url)
    )

    console.log(`📊 去重后剩余 ${uniqueTemplates.length} 个模版`)

    // 下载预览图
    console.log('\n🖼️  开始下载预览图...')
    let downloadedCount = 0

    for (let i = 0; i < uniqueTemplates.length; i++) {
      const template = uniqueTemplates[i]
      if (template.imageUrl) {
        const safeSlug = template.slug?.replace(/[^a-zA-Z0-9-]/g, '-') || `template-${i + 1}`
        const imageFileName = `${safeSlug}.jpg`
        const imagePath = path.join(IMAGES_DIR, imageFileName)

        const success = await downloadImage(template.imageUrl, imagePath)
        if (success) {
          downloadedCount++
          template.imageUrl = `/static-sites/images/${imageFileName}`
          console.log(`  ✅ [${i + 1}/${uniqueTemplates.length}] ${template.title}`)
        } else {
          console.log(`  ❌ [${i + 1}/${uniqueTemplates.length}] ${template.title}`)
        }

        // 下载间隔（防封）
        await sleep(500 + Math.random() * 1500)
      }
    }

    console.log(`\n🖼️  共下载 ${downloadedCount} 张预览图`)

    // 深入每个模版详情页获取更多信息
    console.log('\n📄 开始抓取详情页...')
    const templatesWithDetails = []

    for (let i = 0; i < uniqueTemplates.length; i++) {
      const template = uniqueTemplates[i]
      console.log(`\n📄 [${i + 1}/${uniqueTemplates.length}] 访问: ${template.title}`)

      try {
        await page.goto(template.url!, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })

        await sleep(3000 + Math.random() * 2000)

        // 提取详情页信息
        const detailInfo = await page.evaluate(() => {
          // 获取描述
          const descElement = document.querySelector('p, [class*="description"], [class*="desc"]')
          const description = descElement?.textContent?.trim() || null

          // 获取所有图片
          const images: string[] = []
          document.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src')
            if (src && !src.includes('data:')) {
              images.push(src)
            }
          })

          // 获取特性/标签
          const features: string[] = []
          document.querySelectorAll('[class*="feature"], [class*="tag"], [class*="badge"]').forEach(el => {
            const text = el.textContent?.trim()
            if (text && text.length > 0 && text.length < 100) {
              features.push(text)
            }
          })

          // 获取页面结构信息
          const pageStructure: Array<{name: string, description: string}> = []
          document.querySelectorAll('[class*="page"], [class*="section"]').forEach(el => {
            const heading = el.querySelector('h1, h2, h3, h4')
            if (heading) {
              pageStructure.push({
                name: heading.textContent?.trim() || 'Unknown',
                description: el.textContent?.trim().substring(0, 200) || ''
              })
            }
          })

          return {
            description,
            images: images.slice(0, 10),
            features: [...new Set(features)].slice(0, 20),
            pageStructure: pageStructure.slice(0, 10)
          }
        })

        // 保存详情
        const detailData = {
          ...template,
          detail: detailInfo
        }

        templatesWithDetails.push(detailData)

        // 保存单个详情文件
        const safeSlug = template.slug?.replace(/[^a-zA-Z0-9-]/g, '-') || `template-${i + 1}`
        const detailFileName = `${safeSlug}.json`
        fs.writeFileSync(
          path.join(DETAILS_DIR, detailFileName),
          JSON.stringify(detailData, null, 2)
        )

        console.log(`  ✅ 已保存详情: ${detailFileName}`)

        // 访问间隔（防封）
        const waitTime = 3000 + Math.random() * 2000
        await sleep(waitTime)

      } catch (error) {
        console.error(`  ❌ 访问失败: ${template.title}`)
        templatesWithDetails.push(template)
      }
    }

    // 保存汇总数据
    const data = {
      source: 'wegic.ai/templates',
      scrapedAt: new Date().toISOString(),
      totalTemplates: templatesWithDetails.length,
      templates: templatesWithDetails
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
    console.log(`\n💾 汇总数据已保存到 ${DATA_FILE}`)
    console.log(`📊 共抓取 ${templatesWithDetails.length} 个模版`)
    console.log(`📁 详情文件保存在: ${DETAILS_DIR}`)
    console.log(`🖼️  预览图保存在: ${IMAGES_DIR}`)

    return data

  } catch (error) {
    console.error('❌ 抓取过程中出错:', error)
    throw error
  } finally {
    // 关闭浏览器
    console.log('\n🔒 关闭浏览器...')
    await browser.close()
  }
}

// 运行
main().catch(console.error)
