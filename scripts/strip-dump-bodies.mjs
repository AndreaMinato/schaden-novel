#!/usr/bin/env node

/**
 * Post-process SQL dump files AFTER `nuxt generate` to strip chapter body
 * content from client-side SQLite dumps. Pre-rendered HTML pages already
 * contain the full body, so stripping from the dump only affects client-side
 * navigation queries (which only need metadata like title, path, stem).
 *
 * CRITICAL: Do NOT use `content:file:afterParse` hook instead -- it strips
 * body from the SQLite DB used for BOTH dumps AND pre-rendering, breaking
 * pre-rendered pages.
 *
 * Usage: node scripts/strip-dump-bodies.mjs
 * Run after: nuxt generate
 * Run before: deploy
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { gunzipSync, gzipSync } from 'zlib'
import { resolve } from 'path'

const EMPTY_BODY = '\'{"type":"minimark","value":[],"toc":{"title":"","searchDepth":2,"depth":2,"links":[]}}\''

/**
 * Parse a SQL single-quoted string value starting at position `pos`.
 * Handles '' (escaped single quote) inside the string.
 * Returns the index AFTER the closing quote.
 */
function skipQuotedValue(sql, pos) {
  if (sql[pos] !== "'") throw new Error(`Expected ' at position ${pos}, got ${sql[pos]}`)
  pos++ // skip opening quote
  while (pos < sql.length) {
    if (sql[pos] === "'") {
      if (pos + 1 < sql.length && sql[pos + 1] === "'") {
        pos += 2 // escaped single quote
      } else {
        return pos + 1 // closing quote — return index after it
      }
    } else {
      pos++
    }
  }
  throw new Error('Unterminated quoted string')
}

/**
 * In a SQL INSERT VALUES clause, skip past the comma+space separator
 * between column values. Returns position of next value start.
 */
function skipSeparator(sql, pos) {
  if (sql[pos] === ',') pos++
  if (sql[pos] === ' ') pos++
  return pos
}

/**
 * Replace the body column (3rd column, index 2) in an INSERT INTO _content_X
 * VALUES statement with an empty minimark body.
 *
 * Column order: id(0), title(1), body(2), description(3), ...
 */
function stripBodyFromInsert(stmt) {
  const valuesIdx = stmt.indexOf('VALUES (')
  if (valuesIdx === -1) return stmt

  const startOfValues = valuesIdx + 8 // position after "VALUES ("
  let pos = startOfValues

  // Skip column 0 (id) and column 1 (title)
  for (let col = 0; col < 2; col++) {
    if (stmt[pos] === "'") {
      pos = skipQuotedValue(stmt, pos)
    } else {
      // Unquoted value — advance to next comma
      while (pos < stmt.length && stmt[pos] !== ',') pos++
    }
    pos = skipSeparator(stmt, pos)
  }

  // pos is now at the start of column 2 (body)
  const bodyStart = pos
  if (stmt[pos] === "'") {
    pos = skipQuotedValue(stmt, pos)
  } else {
    while (pos < stmt.length && stmt[pos] !== ',') pos++
  }
  const bodyEnd = pos

  return stmt.substring(0, bodyStart) + EMPTY_BODY + stmt.substring(bodyEnd)
}

// --- Main ---

const dumpDir = resolve('.output/public/__nuxt_content')

if (!existsSync(dumpDir)) {
  console.error('No __nuxt_content directory found. Run nuxt generate first.')
  process.exit(1)
}

const collections = readdirSync(dumpDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

let totalBefore = 0
let totalAfter = 0
let strippedCount = 0

for (const collection of collections) {
  const dumpPath = resolve(dumpDir, collection, 'sql_dump.txt')
  if (!existsSync(dumpPath)) continue

  const raw = readFileSync(dumpPath, 'utf-8')
  const before = Buffer.byteLength(raw, 'utf-8')
  totalBefore += before

  // Decode base64 -> decompress gzip -> get SQL statement array (JSON)
  let buffer, statements
  try {
    buffer = Buffer.from(raw, 'base64')
    statements = JSON.parse(gunzipSync(buffer).toString('utf-8'))
  } catch (err) {
    console.error(`${collection}: Failed to decode/decompress dump: ${err.message}`)
    continue
  }

  if (!Array.isArray(statements)) {
    console.error(`${collection}: Unexpected dump format (not a JSON array)`)
    continue
  }

  // Process each statement — only strip INSERT INTO _content_{name} VALUES
  const contentTablePattern = `INSERT INTO _content_${collection} VALUES`
  let rowsStripped = 0

  const processed = statements.map(stmt => {
    if (typeof stmt === 'string' && stmt.startsWith(contentTablePattern)) {
      rowsStripped++
      return stripBodyFromInsert(stmt)
    }
    return stmt
  })

  if (rowsStripped === 0) {
    console.log(`${collection}: No content rows found to strip (${(before/1024).toFixed(0)}KB unchanged)`)
    totalAfter += before
    continue
  }

  // Recompress and re-encode
  const jsonOut = JSON.stringify(processed)
  const recompressed = gzipSync(Buffer.from(jsonOut))
  const output = recompressed.toString('base64')
  writeFileSync(dumpPath, output)

  const after = Buffer.byteLength(output, 'utf-8')
  totalAfter += after
  strippedCount++

  const reduction = ((1 - after / before) * 100).toFixed(0)
  console.log(`${collection}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (${reduction}% reduction, ${rowsStripped} rows)`)
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB -> ${(totalAfter/1024/1024).toFixed(1)}MB`)
console.log(`Collections stripped: ${strippedCount}/${collections.length}`)
