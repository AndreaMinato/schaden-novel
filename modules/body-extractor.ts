import { defineNuxtModule } from '@nuxt/kit'
import { mkdirSync, writeFileSync, cpSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

interface ManifestEntry {
  path: string
  size: number
}

export default defineNuxtModule({
  meta: { name: 'body-extractor' },
  setup(_options, nuxt) {
    // Only run during generate (not dev)
    if (!nuxt.options._generate) return

    const stagingDir = resolve(nuxt.options.buildDir, 'body-extract')
    const manifest: ManifestEntry[] = []
    let extractCount = 0

    // Phase A: Extract bodies during content compilation
    nuxt.hooks.hook('content:file:afterParse', (ctx: any) => {
      const { content } = ctx

      if (!content.body) return

      // Derive novel slug and chapter stem from content.path (e.g., "/mga/1")
      const pathParts = content.path?.split('/').filter(Boolean)
      if (!pathParts || pathParts.length < 2) return

      const novel = pathParts[0]
      const chapter = pathParts.slice(1).join('/')
      const outPath = resolve(stagingDir, 'novels', novel, `${chapter}.json`)

      // Log diagnostic info on first extracted file
      if (extractCount === 0) {
        console.log(`[body-extractor] First body type: ${content.body.type}`)
        console.log(`[body-extractor] First body keys: ${Object.keys(content.body).join(', ')}`)
        console.log(`[body-extractor] Sample: ${JSON.stringify(content.body).substring(0, 200)}...`)
      }

      // Write body JSON (minified)
      mkdirSync(dirname(outPath), { recursive: true })
      const json = JSON.stringify(content.body)
      writeFileSync(outPath, json)
      manifest.push({ path: `/content/novels/${novel}/${chapter}.json`, size: Buffer.byteLength(json) })
      extractCount++

      // Replace body with empty minimark stub (strips it from SQL dump)
      content.body = {
        type: 'minimark',
        value: [],
        toc: { title: '', searchDepth: 2, depth: 2, links: [] },
      }
    })

    // Phase B: Copy staged files to output + write manifest after build
    nuxt.hooks.hook('close', () => {
      if (extractCount === 0) return

      const destDir = resolve(nuxt.options.rootDir, '.output/public/content')
      try {
        cpSync(stagingDir, destDir, { recursive: true })
      } catch (e) {
        console.error(`[body-extractor] Failed to copy body files: ${e}`)
        return
      }

      // Write manifest
      const totalSize = manifest.reduce((sum, e) => sum + e.size, 0)
      const manifestData = {
        count: manifest.length,
        totalSize,
        files: manifest,
      }
      writeFileSync(resolve(destDir, 'bodies-manifest.json'), JSON.stringify(manifestData))

      console.log(`[body-extractor] Extracted ${extractCount} body files`)
      console.log(`[body-extractor] Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`)
    })
  },
})
