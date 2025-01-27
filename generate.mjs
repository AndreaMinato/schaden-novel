const base = `---
title: [TITLE]
pubDate: [DATE]
tags:
    - [TAG]
---
[CONTENT]
`

import { writeFileSync, read, createReadStream } from 'fs'
import { createInterface } from 'readline'
const filePath = './CHAP.md'


const regx = /Capitolo [0-9]/g


function fromLocal() {

  const TAG = 'mga'

  const rl = createInterface({
    input: createReadStream(filePath),
    output: undefined,
    console: false
  })

  let title = ''
  let content = ''

  rl.on('line', function (line) {
    if (regx.test(line)) {
      if (title) {
        let number = title.match(/[0-9]+/)[0]


        const difference = -6000 + parseInt(number)
        const date = Date.now() + difference * 60 * 60 * 1000
        if (title.includes('prima')) {
          number += '_prima'
        }
        if (title.includes('seconda')) {
          number += '_seconda'
        }
        if (title.includes('terza')) {
          number += '_terza'
        }

        writeFileSync(
          './src/content/novels/' + TAG + '/' + number + '.md',
          base
            .replace('[TAG]', TAG)
            .replace('[TITLE]', title)
            .replace('[CONTENT]', content)
            .replace('[DATE]', new Date(date).toISOString())
        )
      }
      title = line
      content = ''
    } else {
      content += line + '\n'
    }
  });

  rl.on('close', function () {
    let number = title.match(/[0-9]+/)[0]

    const difference = -6000 + parseInt(number)
    const date = Date.now() + difference * 60 * 60 * 1000

    if (title.includes('prima')) {
      number += '_prima'
    }
    if (title.includes('seconda')) {
      number += '_seconda'
    }
    if (title.includes('terza')) {
      number += '_terza'
    }

    writeFileSync(
      './src/content/novels/' + TAG + '/' + number + '.md',
      base
        .replace('[TAG]', TAG)
        .replace('[TITLE]', title)
        .replace('[CONTENT]', content)
        .replace('[DATE]', new Date(date).toISOString())
    )
  })

}




async function fromDocs(TAG, documentId) {
  const url = `https://docs.google.com/document/d/${documentId}/export?format=txt`;

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const text = await response.text();
  var separateLines = text.split(/\r?\n|\r|\n/g);


  const title = separateLines.shift()
  const content = separateLines.join('\n')

  let number = title.match(/[0-9]+/)[0]

  if (title.includes('prima')) {
    number += '_a'
  }
  if (title.includes('seconda')) {
    number += '_b'
  }

  writeFileSync(
    './src/content/novels/' + TAG + '/' + number + '.md',
    base
      .replace('[TAG]', TAG)
      .replace('[TITLE]', title)
      .replace('[CONTENT]', content)
      .replace('[DATE]', new Date().toISOString())
  )

}

import data from './docs.json' with { type: 'json' };

console.log(data);
function loadFromDocs() {
  for (const novel in data) {
    for (const link of data[novel]) {
      console.log(novel, link)
      fromDocs(novel, link)
    }
  }
}

loadFromDocs()
