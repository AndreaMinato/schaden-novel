import { mkdir, appendFile, writeFile, rm } from 'fs/promises'
import { writeChapters } from './readChapters.mjs'
import { loadGoogleDoc, sleep } from './shared.mjs'

export async function loadNovel(novel, ids) {
  console.log(`Starting ${novel}`)
  await mkdir('./tmp/' + novel, { recursive: true })
  await writeFile('./tmp/' + novel + '/chapters.md', '')

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
