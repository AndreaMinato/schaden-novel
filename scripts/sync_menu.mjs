// Sync one novel from its Google Doc menu, importing only chapters not seen before.
//
//   node scripts/sync_menu.mjs <slug>          incremental import of new menu links
//   node scripts/sync_menu.mjs <slug> --seed   mark every current menu link as seen, import nothing
//   node scripts/sync_menu.mjs <slug> --full   ignore state, re-import the whole menu (heavy)
//
// Seen ids live in scripts/menu_state/<slug>.json and are committed with the content.
import { readFile, writeFile, mkdir } from 'fs/promises'
import { loadGoogleDoc, extractDocumentId } from './shared.mjs'
import { loadNovel } from './loadNovel.mjs'

export const MENUS = {
  atg: '1UAr63ltyIGu9a8cbxL7nziRYzJeW2X_x96oWyEMxhbA',
  cd: '1i2opAYNXvXzMrPJI5E4b-8xNtx1vj0iL3lRBFbD-sgk',
  htk: '1c3IGtRohe6IklxlFy2Cn0Ts__WbQQBX-ikNJ7wCZx30',
  issth: '1XNSlUXLISdDebkLiWmRx90Utc5MfJjbxk0qezNwlqHM',
  lrg: '1NlmUC5zJDSA1GeOP-zXzeOiSD8LGufki2AIB5equGQE',
  mga: '1p_XRL5cg2KaBDZpC2YSkKT1TsO8gUdvj2HZDskB2rOg',
  mw: '17m97EysE3iS2x1ufHCUZHBBXMzpmqyzIo7erIp60Z6A',
  overgeared: '1ltYlFG6qnH-rT8-aPtbCJeGZepsR_AX8x2mK9ieVGng',
  rtw: '1UlpiIFhcvkDo_yB9YKpgubhRmxeSFxZKtcflD2Sunok',
  tmw: '1AKE2CdyIllmsBW3ItSwlE7E9VjQMRYduZFla_vY5mPU',
}

const STATE_DIR = new URL('./menu_state/', import.meta.url)

function extractIdsFromHTML(html) {
  const ids = []
  const regex = /<a\s[^>]*href="([^"]*)"[^>]*>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const id = extractDocumentId(match[1])
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

async function readState(slug) {
  try {
    return JSON.parse(await readFile(new URL(`${slug}.json`, STATE_DIR), 'utf8'))
  } catch {
    return []
  }
}

async function writeState(slug, ids) {
  await mkdir(STATE_DIR, { recursive: true })
  await writeFile(new URL(`${slug}.json`, STATE_DIR), JSON.stringify(ids, null, 2) + '\n')
}

async function main() {
  const [slug, flag] = process.argv.slice(2)
  const menuId = MENUS[slug]
  if (!menuId) {
    console.error(`Unknown slug "${slug}". Known: ${Object.keys(MENUS).join(', ')}`)
    process.exit(1)
  }

  const html = await loadGoogleDoc(menuId, 'html')
  const menuIds = extractIdsFromHTML(html)
  if (menuIds.length === 0) {
    console.error(`${slug}: menu returned no doc links, refusing to touch state`)
    process.exit(1)
  }

  const seen = new Set(flag === '--full' ? [] : await readState(slug))
  const fresh = menuIds.filter(id => !seen.has(id))
  console.log(`${slug}: ${menuIds.length} links in menu, ${fresh.length} new`)

  if (flag !== '--seed' && fresh.length > 0) {
    await loadNovel(slug, fresh)
  }

  // Keep ids that vanished from the menu so a temporary menu glitch never re-imports.
  await writeState(slug, [...new Set([...seen, ...menuIds])])
}

main()
