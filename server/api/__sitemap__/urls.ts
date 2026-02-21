import { defineSitemapEventHandler } from '#imports'

const NOVEL_SLUGS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw']

export default defineSitemapEventHandler(async (event) => {
  const allUrls = await Promise.all(
    NOVEL_SLUGS.map(async (novel) => {
      try {
        const chapters = await queryCollection(event, novel as any)
          .select('path', 'pubDate')
          .all()
        return chapters.map(ch => ({
          loc: `/novels${ch.path}`,
          lastmod: ch.pubDate,
          _sitemap: novel,
        }))
      } catch {
        return []
      }
    })
  )
  return allUrls.flat()
})
