// Fetch a user's public GitHub contribution calendar (the green squares) and save it as JSON.
// Usage: node contributions.mjs <out.json> [user]
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

export async function fetchContributions(user = 'parimalgavali') {
  const response = await fetch(`https://github.com/users/${user}/contributions`, { headers: { 'User-Agent': 'portfolio-contributions' } });
  if (!response.ok) throw new Error(`GitHub contributions: HTTP ${response.status}`);
  const html = await response.text();
  const counts = new Map();
  for (const [, id, text] of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)/g)) {
    counts.set(id, Number(text.trim().match(/^(\d+)/)?.[1] ?? 0));
  }
  const days = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*\bdata-date="[^"]*"[^>]*>/g)) {
    days.push([attr(tag, 'data-date'), counts.get(attr(tag, 'id')) ?? 0, Number(attr(tag, 'data-level') ?? 0)]);
  }
  days.sort((a, b) => a[0].localeCompare(b[0]));
  const total = Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1].replace(/,/g, '') ?? NaN);
  if (days.length < 300 || !Number.isFinite(total)) throw new Error(`GitHub contributions: unexpected page (${days.length} days)`);
  return { user, total, days };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [out, user] = process.argv.slice(2);
  if (!out) throw new Error('Usage: node contributions.mjs <out.json> [user]');
  const data = await fetchContributions(user);
  await writeFile(out, JSON.stringify(data) + '\n');
  console.log(`Saved ${data.total} contributions over ${data.days.length} days to ${out}`);
}
