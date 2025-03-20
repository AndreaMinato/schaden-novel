import { writeFileSync, createReadStream, existsSync } from 'fs'
import { createInterface } from 'readline'

const base = `---
title: [TITLE]
pubDate: [DATE]
tags:
    - [TAG]
---
[CONTENT]
`


const regx = /Capitolo [0-9]/g

const regxPrimaInsideBrackets = /[\[\(](.*?prima.*?)[\]\)]/gi
const regxSecondaInsideBrackets = /[\[\(](.*?seconda.*?)[\]\)]/gi
const regxTerzaInsideBrackets = /[\[\(](.*?terza.*?)[\]\)]/gi
const regxQuartaInsideBrackets = /[\[\(](.*?quarta.*?)[\]\)]/gi

function createFile({
  title,
  content,
  tag
}) {
  let number = title.match(/Capitolo\s+(\d+)/i)[1]

  const difference = 0// -6000 + parseInt(number)
  const date = Date.now() + difference * 60 * 60 * 1000

  if (regxPrimaInsideBrackets.test(title)) {
    number += '_a'
  }
  if (regxSecondaInsideBrackets.test(title)) {
    number += '_b'
  }
  if (regxTerzaInsideBrackets.test(title)) {
    number += '_c'
  }
  if (regxQuartaInsideBrackets.test(title)) {
    number += '_d'
  }
  const path = './src/content/novels/' + tag + '/' + number + '.md'

  if (existsSync(path)) {
    console.log(`Skip ${path}`);
    return;
  }

  console.log(`Creating ${path}`)

  writeFileSync(
    path,
    base
      .replace('[TAG]', tag)
      .replace('[TITLE]', title)
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

    rl.on('line', function (line) {
      if (regx.test(line)) {
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
      if(title && content){
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
