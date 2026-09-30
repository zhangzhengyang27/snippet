// Import new Wegic templates to database
import fs from 'fs/promises'

const API_URL = 'http://localhost:5555/api/static-sites'
const URLS_FILE = '/tmp/wegic-preview-urls.json'

async function main() {
  const data: { slug: string; previewUrl: string; title: string }[] = JSON.parse(
    await fs.readFile(URLS_FILE, 'utf-8')
  )

  // Get existing entries to check titles
  const resp = await fetch(API_URL)
  const existing = await resp.json()
  const existingTitles = new Set(
    existing.data
      .filter((i: any) => i.category === 'wegic-template')
      .map((i: any) => i.title.toLowerCase())
  )

  // Filter new templates not already in DB
  const newTemplates = data.filter(t => {
    const titleLower = t.title.toLowerCase()
    return !existingTitles.has(titleLower) && 
           !existingTitles.has(t.slug.replace(/-/g, ' '))
  })

  console.log(`📊 Data file: ${data.length}, Already in DB: ${data.length - newTemplates.length}, New: ${newTemplates.length}\n`)

  let ok = 0, fail = 0

  for (let i = 0; i < newTemplates.length; i++) {
    const t = newTemplates[i]
    const dirNum = 25 + i

    const body = {
      title: t.title,
      description: `Wegic AI generated template: ${t.title}`,
      slug: t.slug,
      category: 'wegic-template',
      tags: [],
      thumbnail: '',
      entryUrl: `/static-sites/wegic/${dirNum}/index.html`,
      pages: [],
      pageCount: 1,
      assetCount: 0,
      externalDeps: [],
      difficulty: 'intermediate',
      isPublished: true,
    }

    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        ok++
      } else {
        fail++
        console.log(`  ❌ ${t.title.substring(0, 50)}: ${r.status}`)
      }
    } catch (e: any) {
      fail++
      console.log(`  ❌ ${t.title.substring(0, 50)}: ${e.message}`)
    }
  }

  console.log(`\n✅ Imported: ${ok} | ❌ Failed: ${fail}`)
}

main().catch(console.error)
