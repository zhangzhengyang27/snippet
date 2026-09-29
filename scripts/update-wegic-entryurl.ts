// Update database entryUrl for all Wegic templates
const API_URL = 'http://localhost:5555/api/static-sites'

interface StaticSite {
  id: number
  title: string
  category: string
  entryUrl: string
}

async function main() {
  // Fetch all templates
  const resp = await fetch(API_URL)
  const data = (await resp.json()) as { data: StaticSite[] }
  const wegic = data.data.filter((i) => i.category === 'wegic-template')

  console.log(`Found ${wegic.length} Wegic templates\n`)

  let updated = 0
  let failed = 0

  for (const item of wegic) {
    const dbId = item.id
    // DB IDs 100-123 map to directories 24-1 (reverse)
    const dirIdx = 124 - dbId
    const newEntryUrl = `/static-sites/wegic/${dirIdx}/index.html`

    console.log(`  DB_ID=${dbId} → dir ${dirIdx}: ${item.title.substring(0, 60)}`)

    try {
      const updateResp = await fetch(`${API_URL}/${dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryUrl: newEntryUrl })
      })

      if (updateResp.ok) {
        updated++
      } else {
        console.log(`    ❌ Failed: ${updateResp.status}`)
        failed++
      }
    } catch (e: unknown) {
      console.log(`    ❌ Error: ${e instanceof Error ? e.message : String(e)}`)
      failed++
    }
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`)
}

main().catch(console.error)
