export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function extractDocumentId(url) {
  const regex = /\/d\/([^\/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function loadGoogleDoc(id, format = 'txt') {
  const url = `https://docs.google.com/document/d/${id}/export?format=${format}`;
  const response = await fetch(url)

  if (!response.ok) {
    console.log(response)
    throw new Error("Network response was not ok");
  }
  const text = await response.text();
  return text
}

const SUFFIX_OFFSET = { a: 1, b: 2, c: 3, d: 4 };

export function calculateWeight(chapterNum, suffix) {
  return chapterNum * 10 + (SUFFIX_OFFSET[suffix] || 0);
}