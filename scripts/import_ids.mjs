import { extractDocumentId } from './shared.mjs'
import { loadNovel } from './loadNovel.mjs'

const novels = {
  atg: [],
  cd: [],
  htk: [],
  issth: [],
  lrg: [],
  mga: [],
  mw: [],
  overgeared: [],
  rtw: [],
  tmw: [],
}

async function loadAll() {
  for (const [novel, urls] of Object.entries(novels)) {
    const ids = urls.map(extractDocumentId)
    if (ids.length === 0) continue
    try {
      await loadNovel(novel, ids)
    } catch { }
  }
}

loadAll()
