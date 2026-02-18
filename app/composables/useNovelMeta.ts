export const NOVEL_NAMES: Record<string, string> = {
  mga: 'Martial God Asura',
  atg: 'Against the Gods',
  overgeared: 'Overgeared',
  tmw: 'True Martial World',
  htk: 'Hail the King',
  issth: 'I Shall Seal the Heavens',
  cd: 'Coiling Dragon',
  lrg: 'LRG',
  mw: 'Martial World',
  rtw: 'Release That Witch',
}

export const NOVEL_SLUGS = Object.keys(NOVEL_NAMES) as Array<keyof typeof NOVEL_NAMES>

export function getNovelName(slug: string): string {
  return NOVEL_NAMES[slug] || slug.toUpperCase()
}
