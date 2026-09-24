import { writeFileSync, createReadStream, existsSync } from 'fs'
import { createInterface } from 'readline'
import { calculateWeight } from './shared.mjs'

const base = `---
weight: [WEIGHT]
title: [TITLE]
pubDate: [DATE]
tags:
    - [TAG]
---
[CONTENT]
`

const parts = [
  { word: 'prima', suffix: 'a' },
  { word: 'seconda', suffix: 'b' },
  { word: 'terza', suffix: 'c' },
  { word: 'quarta', suffix: 'd' },
  { word: 'quinta', suffix: 'e' },
  { word: 'sesta', suffix: 'f' },
].map(({ word, suffix }) => ({
  suffix,
  regex: new RegExp(`[\\[\\(](.*?${word}.*?)[\\]\\)]`, 'i')
}))

function cleanTitle(title) {
  const t = title.trim().replace(/^\[+\s*/, '').replace(/\s*\]+$/, '').replaceAll(':', '-')
  // Quote titles YAML would otherwise misparse (leading [, {, *, &, quotes...).
  return /^[\[\]{}&*!|>'"%@`#,-]/.test(t) ? JSON.stringify(t) : t
}

function createFile({
  title,
  content,
  tag
}) {
  content = content.replace(/^\s*\[+/, '')
  let number = title.match(/(?:Capitolo|Chapter)\s+(\d+)/i)[1]
  const difference = 0// -6000 + parseInt(number)
  const date = Date.now() + difference * 60 * 60 * 1000


  const suffix = parts.find(({ regex }) => regex.test(title))?.suffix ?? null

  if (suffix) {
    number += '_' + suffix
  }
  const path = './content/novels/' + tag + '/' + number + '.md'

  if (existsSync(path)) {
    console.log(`Skip ${path}`);
    return;
  }

  console.log(`Creating ${path}`)

  writeFileSync(
    path,
    base
      .replace('[WEIGHT]', calculateWeight(
        parseInt(title.match(/(?:Capitolo|Chapter)\s+(\d+)/i)[1], 10),
        suffix
      ))
      .replace('[TAG]', tag)
      .replace('[TITLE]', cleanTitle(title))
      .replace('[CONTENT]', content)
      .replace('[DATE]', new Date(date).toISOString())
  )
}

export function writeChapters(path, TAG) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: createReadStream(path),
      output: undefined,
      console: false
    })

    let title = ''
    let content = ''

    const titleRegex = /(?:Capitolo|Chapter)\s+[0-9]/
    rl.on('line', function (line) {
      if (titleRegex.test(line)) {
        if (title) {
          createFile({
            title: title,
            content: content,
            tag: TAG
          })
        }
        title = line
        content = ''
      } else {
        content += line + '\n'
      }
    });

    rl.on('close', function () {
      if (title && content) {
        createFile({
          title: title,
          content: content,
          tag: TAG
        })
      }
      resolve()
    })
  })
}
