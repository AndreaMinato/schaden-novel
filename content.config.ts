import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

const chapterSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()),
})

function novelCollection(dir: string) {
  return defineCollection({
    type: 'page',
    source: `${dir}/**/*.md`,
    schema: chapterSchema,
  })
}

export default defineContentConfig({
  collections: {
    lrg: novelCollection('lrg'),
    mga: novelCollection('mga'),
    atg: novelCollection('atg'),
    overgeared: novelCollection('overgeared'),
    tmw: novelCollection('tmw'),
    htk: novelCollection('htk'),
    issth: novelCollection('issth'),
    cd: novelCollection('cd'),
    mw: novelCollection('mw'),
    rtw: novelCollection('rtw'),
  },
})
