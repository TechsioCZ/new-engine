/// <reference types="node" />

import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const GIT = "/usr/bin/git"
const INITIAL_MIGRATION = "app/migrations/001.ts"
const SCRIPT_PATH = fileURLToPath(
  new URL("check-migration-immutability.mjs", import.meta.url),
)
/** @type {string[]} */
const repositories = []

/**
 * @param {string} repository - Temporary repository path.
 * @param {...string} args - Git arguments.
 */
const git = (repository, ...args) =>
  execFileSync(GIT, args, {
    cwd: repository,
    encoding: "utf-8",
  }).trim()

/**
 * @param {string} repository - Temporary repository path.
 * @param {string} relativePath - Repository-relative file path.
 * @param {string} contents - File contents.
 */
const write = (repository, relativePath, contents) => {
  const filePath = path.join(repository, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

const createRepository = () => {
  const repository = mkdtempSync(path.join(tmpdir(), "migration-immutability-"))
  repositories.push(repository)
  git(repository, "init", "--quiet")
  git(repository, "config", "user.email", "test@example.com")
  git(repository, "config", "user.name", "Test")
  write(repository, INITIAL_MIGRATION, "export const version = 1\n")
  git(repository, "add", ".")
  git(repository, "commit", "--quiet", "-m", "base")
  return { base: git(repository, "rev-parse", "HEAD"), repository }
}

/** @param {string} repository - Temporary repository path. */
const commit = (repository) => {
  git(repository, "add", "-A")
  git(repository, "commit", "--quiet", "-m", "change")
}

/**
 * @param {string} repository - Temporary repository path.
 * @param {string} base - Base commit SHA.
 */
const check = (repository, base) =>
  spawnSync(process.execPath, [SCRIPT_PATH, base], {
    cwd: repository,
    encoding: "utf-8",
  })

afterEach(() => {
  for (const repository of repositories.splice(0)) {
    rmSync(repository, { force: true, recursive: true })
  }
})

void describe("migration immutability check", () => {
  void it("allows new migrations and unrelated changes", () => {
    const { base, repository } = createRepository()
    write(repository, "app/migrations/002.ts", "export const version = 2\n")
    write(repository, "app/src/index.ts", "export const changed = true\n")
    commit(repository)

    assert.equal(check(repository, base).status, 0)
  })

  /** @type {readonly { mutate: (repository: string) => void, name: string }[]} */
  const mutationCases = [
    {
      mutate: (repository) => {
        write(repository, INITIAL_MIGRATION, "changed\n")
      },
      name: "modifications",
    },
    {
      mutate: (repository) => {
        git(repository, "rm", INITIAL_MIGRATION)
      },
      name: "deletions",
    },
    {
      mutate: (repository) => {
        git(repository, "mv", INITIAL_MIGRATION, "app/renamed.ts")
      },
      name: "renames",
    },
    {
      mutate: (repository) => {
        rmSync(path.join(repository, INITIAL_MIGRATION))
        symlinkSync("../target.ts", path.join(repository, INITIAL_MIGRATION))
      },
      name: "type changes",
    },
    {
      mutate: (repository) => {
        write(repository, "app/src/copied.ts", "export const version = 1\n")
      },
      name: "copies",
    },
  ]

  for (const { mutate, name } of mutationCases) {
    void it(`rejects ${name} of committed migrations`, () => {
      const { base, repository } = createRepository()
      mutate(repository)
      commit(repository)

      const result = check(repository, base)
      assert.equal(result.status, 1)
      assert.match(result.stderr, /app\/migrations\/001\.ts/u)
    })
  }
})
