import { Feed } from 'feed'
import { defineEventHandler, getRouterParam, setResponseHeader, createError } from 'h3'

const SITE_URL = 'https://schaden-novel.netlify.app'

const NOVEL_SLUGS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw'] as const

const NOVEL_NAMES: Record<string, string> = {
  mga: 'Martial God Asura',
  atg: 'Against the Gods',
  overgeared: 'Overgeared',
  tmw: 'True Martial World',
  htk: 'History\'s Strongest Senior Brother',
  issth: 'I Shall Seal the Heavens',
  cd: 'Coiling Dragon',
  lrg: 'Library of Ruina Guide',
  mw: 'Martial World',
  rtw: 'Release That Witch',
}

export default defineEventHandler(async (event) => {
  const novel = getRouterParam(event, 'novel')

  if (!novel || !NOVEL_SLUGS.includes(novel as any)) {
    throw createError({ statusCode: 404, message: 'Novel not found' })
  }

  const novelName = NOVEL_NAMES[novel] || novel

  try {
    const feed = new Feed({
      id: `${SITE_URL}/novels/${novel}`,
      title: `${novelName} - Schaden Novels`,
      description: `Latest chapters from ${novelName}`,
      link: `${SITE_URL}/novels/${novel}`,
      copyright: `All rights reserved`,
      updated: new Date(),
      generator: 'Schaden Novels RSS',
    })

    // Query last 50 chapters with full content
    const chapters = await queryCollection(event, novel as any)
      .select('title', 'path', 'pubDate', 'rawbody')
      .order('pubDate', 'DESC')
      .limit(50)
      .all()

    for (const ch of chapters) {
      feed.addItem({
        title: ch.title,
        link: `${SITE_URL}/novels${ch.path}`,
        date: new Date(ch.pubDate),
        content: (ch as any).rawbody || undefined,
      })
    }

    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    return feed.rss2()
  } catch (err: any) {
    // If it's our 404, re-throw
    if (err?.statusCode === 404) throw err

    // Return minimal valid RSS on any other error
    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${novelName} - Schaden Novels</title>
    <link>${SITE_URL}/novels/${novel}</link>
    <description>Latest chapters from ${novelName}</description>
  </channel>
</rss>`
  }
})
