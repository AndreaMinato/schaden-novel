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

function extractIdsFromHTML(htmlString) {
  const $ = load(htmlString); // Load the HTML string into cheerio
  const ids = [];

  // Loop through all <a> elements and extract their href attributes
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      const id = extractDocumentId(href)
      if (id) {
        ids.push(id)
      }
    }
  });

  return ids;
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

async function loadNovel(_id, novel) {
  console.log(`Starting ${novel}`)
  await mkdir('./tmp/' + novel, { recursive: true })
  await writeFile('./tmp/' + novel + '/chapters.md', '')

  const content = await loadGoogleDoc(_id, 'html')

  const ids = extractIdsFromHTML(content)

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

async function loadAll() {
  // await loadNovel('1p_XRL5cg2KaBDZpC2YSkKT1TsO8gUdvj2HZDskB2rOg', 'mga')
  // await loadNovel('1UAr63ltyIGu9a8cbxL7nziRYzJeW2X_x96oWyEMxhbA', 'atg')
  // await loadNovel('1c3IGtRohe6IklxlFy2Cn0Ts__WbQQBX-ikNJ7wCZx30', 'htk')
  // await loadNovel('1AKE2CdyIllmsBW3ItSwlE7E9VjQMRYduZFla_vY5mPU', 'tmw')
  // await loadNovel('1NlmUC5zJDSA1GeOP-zXzeOiSD8LGufki2AIB5equGQE', 'lrg')
  // await loadNovel('1i2opAYNXvXzMrPJI5E4b-8xNtx1vj0iL3lRBFbD-sgk', 'cd')
  // await loadNovel('17m97EysE3iS2x1ufHCUZHBBXMzpmqyzIo7erIp60Z6A', 'mw')
  // await loadNovel('1ltYlFG6qnH-rT8-aPtbCJeGZepsR_AX8x2mK9ieVGng', 'overgeared')
  // await loadNovel('1XNSlUXLISdDebkLiWmRx90Utc5MfJjbxk0qezNwlqHM', 'issth')
  await loadNovel('1UlpiIFhcvkDo_yB9YKpgubhRmxeSFxZKtcflD2Sunok', 'rtw')
}

loadAll()
