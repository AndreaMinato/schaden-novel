const base = `---
title: [TITLE]
pubDate: [DATE]
tags:
    - mga
---
[CONTENT]
`

import { writeFileSync, read, createReadStream } from 'fs'
import { createInterface } from 'readline'
const filePath = './CHAP.md'


const regx = /Capitolo [0-9]/

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
            if(title.includes('prima')){
                number += '_prima'
            }
            if(title.includes('seconda')){
                number += '_seconda'
            }
            if(title.includes('terza')){
                number += '_terza'
            }

            writeFileSync('./src/content/novels/mga/' + number + '.md', base.replace('[TITLE]', title).replace('[CONTENT]', content).replace('[DATE]', new Date(date).toISOString()))
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

    if(title.includes('prima')){
        number += '_prima'
    }
    if(title.includes('seconda')){
        number += '_seconda'
    }
    if(title.includes('terza')){
        number += '_terza'
    }

    writeFileSync('./src/content/novels/mga/' + number + '.md', base.replace('[TITLE]', title).replace('[CONTENT]', content).replace('[DATE]', new Date(date).toISOString()))
})
