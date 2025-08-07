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


  const contains = {
    title,
    prima: Boolean(title.match(regxPrimaInsideBrackets)),
    seconda: Boolean(title.match(regxSecondaInsideBrackets)),
    terza: Boolean(title.match(regxTerzaInsideBrackets)),
    quarta: Boolean(title.match(regxQuartaInsideBrackets))
  }

  if (contains.prima) {
    number += '_a'
  }
  else if (contains.seconda) {
    number += '_b'
  }
  else if (contains.terza) {
    number += '_c'
  }
  else if (contains.quarta) {
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
      .replace('[TITLE]', title.replace(':', '-'))
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

    const titleRegex = /Capitolo\s+[0-9]/g
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
