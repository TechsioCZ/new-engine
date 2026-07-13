#!/usr/bin/env node
/**
 * SessionStart hook: install the plugin's `pre-push` git hook into the repo.
 *
 * The git hook is the real gate — git hands it the exact refs and SHAs being pushed, so unlike
 * an agent-side command-string parser it cannot be fooled by aliases, refspec forms, or config.
 *
 * Idempotent. Never clobbers a pre-push hook this plugin did not write: if a foreign hook is
 * present it warns and leaves it alone, so the human's own hook always wins.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "git pre-push hook — the REAL ui-kit quality gate";
const source = join(dirname(dirname(fileURLToPath(import.meta.url))), "hooks", "pre-push");

let gitDir;
try {
  gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  process.exit(0); // not a git repo — nothing to install
}

// Respect a configured hooksPath (husky, lefthook, …) so we install where git actually looks.
let hooksDir = join(gitDir, "hooks");
try {
  const configured = execFileSync("git", ["config", "--get", "core.hooksPath"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (configured) hooksDir = configured;
} catch {
  // unset → default
}

const target = join(hooksDir, "pre-push");

const chained = `${target}.pre-ui-kit`;

if (existsSync(target)) {
  const current = readFileSync(target, "utf8");

  if (current.includes(MARKER)) {
    // Ours already — refresh it if the plugin shipped a newer version.
    if (current === readFileSync(source, "utf8")) process.exit(0);
  } else {
    // A foreign hook (husky, lefthook, hand-written). Do NOT skip installation — that would
    // leave the gate unenforced in exactly the repos that already care about hooks. Move it
    // aside instead; our hook runs it first and honours its exit code, so it still wins.
    if (!existsSync(chained)) {
      try {
        renameSync(target, chained);
        chmodSync(chained, 0o755);
        process.stderr.write(
          `ui-kit: existing pre-push hook preserved as "${chained}" and chained — it runs first.\n`,
        );
      } catch (err) {
        process.stderr.write(
          `ui-kit: could not preserve the existing pre-push hook (${err.message}) — leaving it untouched, gate NOT installed.\n`,
        );
        process.exit(0); // never destroy a hook we cannot back up
      }
    }
  }
}

try {
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, 0o755);
} catch (err) {
  process.stderr.write(`ui-kit: could not install pre-push hook: ${err.message}\n`);
}

process.exit(0);
