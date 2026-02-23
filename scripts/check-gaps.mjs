import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const NOVELS_DIR = new URL('../content/novels', import.meta.url).pathname;

function toRanges(nums) {
  if (nums.length === 0) return '';
  nums.sort((a, b) => a - b);
  const ranges = [];
  let start = nums[0], end = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = nums[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

async function checkNovel(novelDir) {
  const files = await readdir(novelDir);
  const numbers = new Set();
  for (const f of files) {
    if (!f.endsWith('.md') || f === '_index.md') continue;
    const match = f.match(/^(\d+)(?:_[a-d])?\.md$/);
    if (match) numbers.add(parseInt(match[1], 10));
  }
  return numbers;
}

async function main() {
  const novels = await readdir(NOVELS_DIR);
  for (const novel of novels.sort()) {
    const novelDir = join(NOVELS_DIR, novel);
    const st = await stat(novelDir);
    if (!st.isDirectory()) continue;

    const numbers = await checkNovel(novelDir);
    if (numbers.size <= 1) continue;

    const max = Math.max(...numbers);
    const missing = [];
    for (let i = 1; i <= max; i++) {
      if (!numbers.has(i)) missing.push(i);
    }

    if (missing.length === 0) {
      console.log(`${novel}: 1-${max}, no gaps`);
    } else {
      console.log(`${novel}: 1-${max}, missing: ${toRanges(missing)}`);
    }
  }
}

main().catch(console.error);
