#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Automate the mechanical parts of cutting a release.
 *
 * Non-mechanical work (writing release-theme summaries, updating README
 * Version History for themed releases) is expected to be done by hand
 * BEFORE running this script — anything the script would have to write
 * as prose would be an educated guess. Same for milestone hygiene.
 *
 * Usage:
 *   npm run release            # prompts for bump kind
 *   npm run release -- patch   # skip the prompt
 *   npm run release -- minor
 *   npm run release -- major
 *
 * What it does:
 *   1. git checkout main + pull
 *   2. Bump root/server/react-app/converter package.json versions
 *   3. Regenerate server/openapi.json + react-app/src/lib/api-schema.ts
 *   4. Promote CHANGELOG's [Unreleased] → [<new>] - <today> + add empty
 *      [Unreleased] + append diff-link at the footer
 *   5. Rewrite SETUP.md's install/upgrade/gc examples to the new version
 *   6. Validate: typecheck + lint + tests across react-app, server,
 *      converter, plus the react-app production build
 *   7. Commit on release/<new>, push, open a PR titled "Release <new>"
 *   8. gh pr merge --auto --squash, poll until merged
 *   9. git tag v<new>, push, gh release create v<new> --latest with the
 *      new CHANGELOG section as notes
 *
 * Any step failing exits non-zero and leaves the working tree at the
 * failure point so it can be investigated by hand.
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);

const sh = (cmd: string, opts: { capture?: boolean; cwd?: string } = {}) => {
  const cwd = opts.cwd ?? ROOT;
  if (opts.capture) {
    return execSync(cmd, { cwd, encoding: "utf8" }).trim();
  }
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Command failed (${r.status}): ${cmd}`);
  return "";
};

const readPkg = (relPath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(ROOT, relPath), "utf8"));

const writePkg = (relPath: string, pkg: Record<string, unknown>): void => {
  writeFileSync(path.join(ROOT, relPath), JSON.stringify(pkg, null, 2) + "\n");
};

const promptBumpKind = async (): Promise<"major" | "minor" | "patch"> => {
  const arg = process.argv[2]?.toLowerCase();
  if (arg === "major" || arg === "minor" || arg === "patch") return arg;
  if (arg) {
    console.error(`Unknown bump kind: "${arg}". Expected major, minor, or patch.`);
    process.exit(2);
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question("Bump kind (major/minor/patch): "))
    .trim()
    .toLowerCase();
  rl.close();
  if (answer === "major" || answer === "minor" || answer === "patch")
    return answer;
  console.error(`Unknown bump kind: "${answer}".`);
  process.exit(2);
};

const bumpSemver = (
  current: string,
  kind: "major" | "minor" | "patch"
): string => {
  // Strip any pre-release / build tag first — semver bumps on those follow
  // different rules that aren't part of this script's job (release.ts is
  // for the stable-line 1.x.y flow; rc / alpha cuts are still by hand).
  const stripped = current.replace(/[-+].*$/, "");
  const parts = stripped.split(".").map((n) => Number(n));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unrecognised version "${current}"; expected X.Y.Z`);
  }
  const [major, minor, patch] = parts;
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const today = (): string => {
  // Match the CHANGELOG's ISO-date style (YYYY-MM-DD). Use the local
  // date — CHANGELOG dates historically use whatever wall-clock the
  // release cut on, not UTC.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const promoteChangelog = (from: string, to: string): void => {
  const changelogPath = path.join(ROOT, "CHANGELOG.md");
  const src = readFileSync(changelogPath, "utf8");
  // Section promotion. Replaces the `## [Unreleased]` header (and only that
  // — leaves whatever content is under it in place) with an empty
  // [Unreleased] on top and a stamped [<to>] - <today> below it. Anchor
  // strictly on the header line without consuming the following newline
  // so the blank line that separates sections stays intact.
  const unreleasedRe = /^## \[Unreleased\][ \t]*$/m;
  if (!unreleasedRe.test(src)) {
    throw new Error("CHANGELOG.md: no `## [Unreleased]` header to promote");
  }
  const promoted = src.replace(
    unreleasedRe,
    `## [Unreleased]\n\n## [${to}] - ${today()}`
  );
  // Append the diff-link at the footer next to the previous version's
  // link. The pattern anchors on the previous version so this stays
  // ordered.
  const prevLinkRe = new RegExp(
    `^\\[${from.replace(/\./g, "\\.")}\\]: (.+)$`,
    "m"
  );
  const match = promoted.match(prevLinkRe);
  if (!match) {
    throw new Error(
      `CHANGELOG.md: no diff-link entry for previous version [${from}] to anchor the new footer entry`
    );
  }
  const newLink = `[${to}]: https://github.com/vlumi/photo-diary/compare/v${from}...v${to}`;
  const withFooter = promoted.replace(prevLinkRe, `${newLink}\n${match[0]}`);
  writeFileSync(changelogPath, withFooter);
  console.log(`✓ CHANGELOG.md: promoted [Unreleased] → [${to}] - ${today()}`);
};

const bumpSetupMd = (from: string, to: string): void => {
  const setupPath = path.join(ROOT, "SETUP.md");
  if (!existsSync(setupPath)) return;
  const src = readFileSync(setupPath, "utf8");
  // SETUP.md's install / upgrade / gc examples embed the current version
  // literal in ~6 sites. Replace all occurrences of the exact from-string.
  const out = src.split(from).join(to);
  if (out === src) {
    console.log(`✓ SETUP.md: no ${from} references (unchanged)`);
    return;
  }
  writeFileSync(setupPath, out);
  console.log(`✓ SETUP.md: ${from} → ${to}`);
};

const bumpVersionInAllPkgs = (to: string): void => {
  // Bump the root, then defer to the existing `bin/sync-versions.mjs`
  // (already `npm run version:sync`) to propagate to workspaces + refresh
  // the lockfile. Keeps one canonical propagation path.
  const rootPkg = readPkg("package.json");
  rootPkg.version = to;
  writePkg("package.json", rootPkg);
  console.log(`✓ package.json: version → ${to}`);
  sh("npm run version:sync");
};

const extractChangelogSection = (version: string): string => {
  const src = readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  // Slice out lines from `## [<version>] ` through the line before the
  // next `## [`. First and last lines get trimmed on either end so the
  // release-notes file doesn't lead / trail with blank paragraphs.
  const re = new RegExp(
    `^## \\[${version.replace(/\./g, "\\.")}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[)`,
    "m"
  );
  const m = src.match(re);
  if (!m) throw new Error(`CHANGELOG: no section for [${version}]`);
  return m[1].trim() + "\n";
};

const pollUntilMerged = async (
  prNumber: number,
  timeoutMs = 30 * 60 * 1000
): Promise<void> => {
  const start = Date.now();
  console.log(`⏳ Waiting for PR #${prNumber} to merge…`);
  // 15 s cadence balances responsiveness against gh API rate limit.
  while (Date.now() - start < timeoutMs) {
    const state = sh(`gh pr view ${prNumber} --json state -q .state`, {
      capture: true,
    });
    if (state === "MERGED") {
      console.log(`✓ PR #${prNumber} merged`);
      return;
    }
    if (state === "CLOSED") {
      throw new Error(`PR #${prNumber} was closed without merging`);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error(
    `PR #${prNumber} did not merge within ${Math.round(timeoutMs / 60000)} min`
  );
};

const main = async (): Promise<void> => {
  const bump = await promptBumpKind();
  const current = readPkg("package.json").version as string;
  const next = bumpSemver(current, bump);
  console.log(`\n🚀 ${current} → ${next} (${bump})\n`);

  // Guard: refuse to run if the working tree isn't clean. A stray edit
  // would end up on the release commit — better to stop than fold it in.
  const dirty = sh("git status --porcelain", { capture: true });
  if (dirty) {
    throw new Error(
      "Working tree is not clean. Commit or stash local changes first.\n" + dirty
    );
  }

  console.log("→ git checkout main && pull");
  sh("git checkout main");
  sh("git pull --ff-only");

  const branch = `release/${next}`;
  console.log(`→ git checkout -b ${branch}`);
  sh(`git checkout -b ${branch}`);

  console.log("\n→ Bumping versions");
  bumpVersionInAllPkgs(next);

  console.log("\n→ Regenerating server/openapi.json");
  sh("npm run docs:dump", { cwd: path.join(ROOT, "server") });

  console.log("\n→ Regenerating react-app/src/lib/api-schema.ts");
  sh("npm run api:codegen", { cwd: path.join(ROOT, "react-app") });

  console.log("\n→ Promoting CHANGELOG");
  promoteChangelog(current, next);

  console.log("\n→ Bumping SETUP.md");
  bumpSetupMd(current, next);

  console.log("\n→ Validating (typecheck + lint + tests + build)");
  for (const ws of ["react-app", "server", "converter"]) {
    console.log(`  · ${ws} typecheck`);
    sh("npm run typecheck", { cwd: path.join(ROOT, ws) });
    console.log(`  · ${ws} lint`);
    sh("npm run lint", { cwd: path.join(ROOT, ws) });
    console.log(`  · ${ws} test`);
    sh("npm test", { cwd: path.join(ROOT, ws) });
  }
  console.log("  · react-app build");
  sh("npm run build", { cwd: path.join(ROOT, "react-app") });

  console.log("\n→ Committing");
  sh("git add -A");
  sh(`git commit -m "Release ${next}"`);

  console.log(`\n→ Pushing ${branch}`);
  sh(`git push -u origin ${branch}`);

  // Extract the just-promoted section for both PR body and release notes.
  const changelogSection = extractChangelogSection(next);

  console.log("\n→ Opening PR");
  const prBody =
    `## Summary\n\n${changelogSection}\n---\n\n` +
    `Prepared with \`npm run release -- ${bump}\`.\n` +
    `\n**Post-merge (automated):** tag \`v${next}\`, push, publish GitHub Release as \`--latest\` with the \`[${next}]\` CHANGELOG section as notes.\n`;
  const prBodyFile = `/tmp/release-${next}-pr-body.md`;
  writeFileSync(prBodyFile, prBody);
  sh(
    `gh pr create --title "Release ${next}" --body-file ${prBodyFile} --base main --head ${branch}`
  );
  const prNumber = Number(
    sh(`gh pr view ${branch} --json number -q .number`, { capture: true })
  );
  console.log(`✓ PR #${prNumber} opened`);

  console.log(`\n→ Enabling auto-merge on PR #${prNumber}`);
  sh(`gh pr merge ${prNumber} --auto --squash`);

  await pollUntilMerged(prNumber);

  console.log("\n→ Updating main + tagging");
  sh("git checkout main");
  sh("git pull --ff-only");
  sh(`git tag -a v${next} -m "Release ${next}"`);
  sh(`git push origin v${next}`);

  console.log("\n→ Publishing GitHub Release");
  const notesFile = `/tmp/release-${next}-notes.md`;
  writeFileSync(notesFile, changelogSection);
  sh(
    `gh release create v${next} --title v${next} --notes-file ${notesFile} --latest`
  );

  console.log(
    `\n🎉 ${next} released → https://github.com/vlumi/photo-diary/releases/tag/v${next}\n`
  );
};

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
