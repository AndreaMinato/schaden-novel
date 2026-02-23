import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const NOVELS_DIR = new URL('../content/novels', import.meta.url).pathname;

function extractWeight(filename) {
  const base = basename(filename, '.md');
  const match = base.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

async function processNovel(novelDir) {
  const files = await readdir(novelDir);
  const mdFiles = files.filter(f => f.endsWith('.md') && f !== '_index.md');
  let count = 0;

  for (const file of mdFiles) {
    const filePath = join(novelDir, file);
    const content = await readFile(filePath, 'utf-8');

    if (content.includes('\nweight:')) continue; // already has weight

    const weight = extractWeight(file);
    if (weight === null) {
      console.warn(`  Skipping ${file} — no chapter number found`);
      continue;
    }

    // Inject weight after opening ---
    const updated = content.replace(/^---\n/, `---\nweight: ${weight}\n`);
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
