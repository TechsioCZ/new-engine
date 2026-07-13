#!/usr/bin/env node
/**
 * Bundles the deep skills from libs/ui/skills/ into this plugin so the plugin
 * can be published standalone (outside the new-engine repo).
 *
 * libs/ui/skills/ stays the single source of truth — run this before every
 * plugin release:
 *
 *   node scripts/sync-skills.mjs
 *
 * Copies every skill directory except `_artifacts`, refuses to overwrite the
 * plugin's own authored workflow skills on a name collision.
 */
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(pluginDir, "../skills"); // libs/ui/skills
const destDir = resolve(pluginDir, "skills");

const AUTHORED = new Set([
  "ui-new-component",
  "ui-tokens",
  "ui-story",
  "ui-validate",
  "ui-theme-brand",
  "ui-figma-sync",
  "ui-release-check",
  "ui-component-usage",
]);

if (!existsSync(srcDir)) {
  console.error(`Source skills directory not found: ${srcDir}`);
  console.error("Run this script from a checkout of the new-engine repo (plugin at libs/ui/agent-plugin).");
  process.exit(1);
}

const entries = readdirSync(srcDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "_artifacts")
  .map((e) => e.name);

let copied = 0;
for (const name of entries) {
  if (AUTHORED.has(name)) {
    console.error(`COLLISION: repo skill "${name}" clashes with an authored plugin skill — rename one.`);
    process.exit(1);
  }
  const dest = resolve(destDir, name);
  rmSync(dest, { recursive: true, force: true });
  cpSync(resolve(srcDir, name), dest, { recursive: true });
  copied++;
}

console.log(`Bundled ${copied} skills from ${srcDir} into ${destDir}`);
