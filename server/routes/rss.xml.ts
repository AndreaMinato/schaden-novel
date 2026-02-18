import { Feed } from 'feed'
import { defineEventHandler, setResponseHeader } from 'h3'

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
  try {
    const feed = new Feed({
      id: SITE_URL,
      title: 'Schaden Novels',
      description: 'Latest chapter updates across all novels',
      link: SITE_URL,
      copyright: `All rights reserved`,
      updated: new Date(),
      generator: 'Schaden Novels RSS',
    })

    // Query all novels in parallel — last 50 chapters each
    const allChapters = await Promise.all(
      NOVEL_SLUGS.map(async (novel) => {
        try {
          const chapters = await queryCollection(event, novel as any)
            .select('title', 'path', 'pubDate')
            .order('pubDate', 'DESC')
            .limit(50)
            .all()
          return chapters.map((ch) => ({ ...ch, novel }))
        } catch {
          // Collection may be empty or missing — skip gracefully
          return []
        }
      })
    )

    // Merge, sort by date descending, take top 50
    const merged = allChapters
      .flat()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 50)

    for (const ch of merged) {
      feed.addItem({
        title: `[${NOVEL_NAMES[ch.novel] || ch.novel}] ${ch.title}`,
        link: `${SITE_URL}/novels${ch.path}`,
        date: new Date(ch.pubDate),
      })
    }

    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    return feed.rss2()
  } catch {
    // Return minimal valid RSS on any error
    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Schaden Novels</title>
    <link>${SITE_URL}</link>
    <description>Latest chapter updates</description>
  </channel>
</rss>`
  }
})
