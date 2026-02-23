import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const NOVELS_DIR = new URL('../content/novels', import.meta.url).pathname;

const SUFFIX_OFFSET = { a: 1, b: 2, c: 3, d: 4 };

function extractWeight(filename) {
  const base = basename(filename, '.md');
  const match = base.match(/^(\d+)(?:_([a-d]))?$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 10 + (SUFFIX_OFFSET[match[2]] || 0);
}

async function processNovel(novelDir) {
  const files = await readdir(novelDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== '_index.md');
  let count = 0;

  for (const file of mdFiles) {
    const filePath = join(novelDir, file);
    const content = await readFile(filePath, 'utf-8');

    // Replace existing weight or add new one
    const hasWeight = content.includes('\nweight:');

    const weight = extractWeight(file);
    if (weight === null) {
      console.warn(`  Skipping ${file} — no chapter number found`);
      continue;
    }

    let updated;
    if (hasWeight) {
      updated = content.replace(/\nweight:\s*\d+/, `\nweight: ${weight}`);
    } else {
      updated = content.replace(/^---\n/, `---\nweight: ${weight}\n`);
    }
    await writeFile(filePath, updated, 'utf-8');
    count++;
  }

  return count;
}

async function main() {
  const novels = await readdir(NOVELS_DIR);
  let total = 0;

  for (const novel of novels.sort()) {
    const novelDir = join(NOVELS_DIR, novel);
    const st = await stat(novelDir);
    if (!st.isDirectory()) continue;
    const count = await processNovel(novelDir);
    console.log(`${novel}: ${count} files updated`);
    total += count;
  }

  console.log(`\nTotal: ${total} files updated`);
}

main().catch(console.error);
