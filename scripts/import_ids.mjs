import { load } from 'cheerio'
import { mkdir, appendFile, writeFile, rm } from 'fs/promises'
import { writeChapters } from './readChapters.mjs'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDocumentId(url) {
  const regex = /\/d\/([^\/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null; // Returns the ID or null if not found
}



async function loadGoogleDoc(id, format = 'txt') {
  const url = `https://docs.google.com/document/d/${id}/export?format=${format}`;
  const response = await fetch(url)

  if (!response.ok) {
    console.log(response)
    throw new Error("Network response was not ok");
  }
  const text = await response.text();
  return text
}

async function loadNovel(novel) {
  console.log(`Starting ${novel}`)
  await mkdir('./tmp/' + novel, { recursive: true })
  await writeFile('./tmp/' + novel + '/chapters.md', '')

  const ids = novels[novel].map(extractDocumentId)

  console.log(ids)
  for (const id of ids) {
    try {
      const text = await loadGoogleDoc(id)
      appendFile('./tmp/' + novel + '/chapters.md', '\n\n' + text)
    } catch (error) {

    }
  }

  await sleep(500)
  await writeChapters('./tmp/' + novel + '/chapters.md', novel)
  await rm('./tmp/' + novel, {
    recursive: true
  })
  console.log(`End ${novel}`)
}




const novels = {
  mga: [],
  atg: [],
  tmw: [],
  htk: [],
  lrg: [],
  cd: [],
  mw: [],
}

async function loadAll() {
  await loadNovel('mga')
  await loadNovel('atg')
  await loadNovel('htk')
  await loadNovel('tmw')
  // await loadNovel('lrg')
  // await loadNovel('cd')
  // await loadNovel('mw')
}

loadAll()
