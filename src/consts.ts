// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import type { InferEntrySchema, RenderedContent } from "astro:content";

export const SITE_TITLE = 'Schaden Novels';
export const SITE_DESCRIPTION = 'La casa di tutte le novel tradotte da Schadenfreude';

type ChapterCollectionReturn = {
  id: string;
  body?: string;
  collection: "chapters";
  data: InferEntrySchema<"chapters">;
  rendered?: RenderedContent;
  filePath?: string;
}

export function defaultSort(a: ChapterCollectionReturn, b: ChapterCollectionReturn) {

  const [aNovel, aId] = a.id.split('/')
  const [bNovel, bId] = b.id.split('/')

  if (aNovel === bNovel) {

    let ANumber = parseInt(aId)
    let BNumber = parseInt(bId)

    if (aId.includes('_b')) {
      ANumber += 0.5
    }
    if (bId.includes('_b')) {
      BNumber += 0.5
    }

    if (
      ANumber != null &&
      !isNaN(ANumber) &&
      BNumber != null &&
      !isNaN(BNumber)
    ) {
      return BNumber - ANumber
    }

  }

  console.log('fallback for ' + a.id + ' and ' + b.id)
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
}
