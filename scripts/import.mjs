import { loadGoogleDoc, extractDocumentId } from './shared.mjs'
import { loadNovel } from './loadNovel.mjs'

const NOVELS = {
  atg: '1UAr63ltyIGu9a8cbxL7nziRYzJeW2X_x96oWyEMxhbA',
  // cd: '1i2opAYNXvXzMrPJI5E4b-8xNtx1vj0iL3lRBFbD-sgk',
  htk: '1c3IGtRohe6IklxlFy2Cn0Ts__WbQQBX-ikNJ7wCZx30',
  issth: '1XNSlUXLISdDebkLiWmRx90Utc5MfJjbxk0qezNwlqHM',
  // lrg: '1NlmUC5zJDSA1GeOP-zXzeOiSD8LGufki2AIB5equGQE',
  mga: '1p_XRL5cg2KaBDZpC2YSkKT1TsO8gUdvj2HZDskB2rOg',
  mw: '17m97EysE3iS2x1ufHCUZHBBXMzpmqyzIo7erIp60Z6A',
  overgeared: '1ltYlFG6qnH-rT8-aPtbCJeGZepsR_AX8x2mK9ieVGng',
  rtw: '1UlpiIFhcvkDo_yB9YKpgubhRmxeSFxZKtcflD2Sunok',
  tmw: '1AKE2CdyIllmsBW3ItSwlE7E9VjQMRYduZFla_vY5mPU',
}

function extractIdsFromHTML(htmlString) {
  const ids = [];
  const regex = /<a\s[^>]*href="([^"]*)"[^>]*>/gi;
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    const id = extractDocumentId(match[1]);
    if (id) ids.push(id);
  }
  return ids;
}

async function loadAll() {
  for (const [novel, indexId] of Object.entries(NOVELS)) {
    try {
      const content = await loadGoogleDoc(indexId, 'html')
      const ids = extractIdsFromHTML(content)
      await loadNovel(novel, ids)
    } catch { }
  }
}

loadAll()
