// One-shot fetcher for the screenshot fixture set. Queries NASA's
// public image API for a handful of search terms, picks the first N
// per query, and downloads the medium-size JPEG of each.
//
// Re-run with `node fetch.mjs` to refresh. The result is committed to
// the repo so the screenshots remain reproducible without network.
//
// NASA images are works of the U.S. Government — public domain
// (https://www.nasa.gov/nasa-brand-center/images-and-media/).

import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "photos");
const ATTRIBUTION = path.join(__dirname, "PHOTOS.md");

const QUERIES = [
  { q: "earth landscape", count: 5 },
  { q: "aurora", count: 4 },
  { q: "moon", count: 3 },
  { q: "iss astronaut", count: 4 },
  { q: "nebula", count: 4 },
  { q: "galaxy", count: 3 },
  { q: "mars surface", count: 3 },
  { q: "spacecraft launch", count: 4 },
];

const search = async (q, count) => {
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=${count + 5}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search failed: ${q}`);
  const data = await res.json();
  return (data.collection?.items ?? []).slice(0, count);
};

const downloadOne = async (item) => {
  const meta = item.data?.[0] ?? {};
  const id = meta.nasa_id;
  if (!id) return null;
  const outFile = path.join(OUT_DIR, `${id}.jpg`);
  if (existsSync(outFile)) {
    return { id, title: meta.title, description: meta.description, file: outFile, skipped: true };
  }
  const colRes = await fetch(item.href);
  if (!colRes.ok) return null;
  const urls = await colRes.json();
  // Prefer ~medium; fall back to ~small if missing.
  const medium = urls.find((u) => typeof u === "string" && u.endsWith("~medium.jpg"));
  const small = urls.find((u) => typeof u === "string" && u.endsWith("~small.jpg"));
  const target = medium ?? small;
  if (!target) return null;
  const imgRes = await fetch(target.replace(/^http:/, "https:"));
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outFile, buf);
  return {
    id,
    title: meta.title,
    description: (meta.description ?? "").slice(0, 200),
    file: outFile,
    sourceUrl: `https://images.nasa.gov/details/${id}`,
  };
};

const main = async () => {
  const all = [];
  for (const { q, count } of QUERIES) {
    process.stdout.write(`Searching "${q}"… `);
    const items = await search(q, count);
    let added = 0;
    for (const item of items) {
      const result = await downloadOne(item);
      if (result) {
        all.push(result);
        added++;
      }
      if (added >= count) break;
    }
    console.log(`got ${added}`);
  }

  let md = "# Photo attribution\n\n";
  md += "All images sourced from [NASA's public image library](https://images.nasa.gov/) and used under the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) — NASA imagery is generally not copyrighted and may be used for educational or informational purposes.\n\n";
  md += `${all.length} photos:\n\n`;
  md += "| ID | Title | Source |\n";
  md += "|---|---|---|\n";
  for (const p of all) {
    const title = (p.title ?? "").replace(/\|/g, "\\|");
    md += `| ${p.id} | ${title} | [details](${p.sourceUrl}) |\n`;
  }
  writeFileSync(ATTRIBUTION, md);
  console.log(`\n${all.length} photos downloaded; attribution written to PHOTOS.md`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
