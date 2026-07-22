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

const SCRIPT_PATH = fileURLToPath(
  new URL("./check-migration-immutability.mjs", import.meta.url)
)
const repositories = []

function git(repository, ...args) {
  return execFileSync("git", args, {
    cwd: repository,
    encoding: "utf-8",
  }).trim()
}

function write(repository, relativePath, contents) {
  const filePath = path.join(repository, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

function createRepository() {
  const repository = mkdtempSync(path.join(tmpdir(), "migration-immutability-"))
  repositories.push(repository)
  git(repository, "init", "--quiet")
  git(repository, "config", "user.email", "test@example.com")
  git(repository, "config", "user.name", "Test")
  write(repository, "app/migrations/001.ts", "export const version = 1\n")
  git(repository, "add", ".")
  git(repository, "commit", "--quiet", "-m", "base")
  return { base: git(repository, "rev-parse", "HEAD"), repository }
}

function commit(repository) {
  git(repository, "add", "-A")
  git(repository, "commit", "--quiet", "-m", "change")
}

function check(repository, base) {
  return spawnSync(process.execPath, [SCRIPT_PATH, base], {
    cwd: repository,
    encoding: "utf-8",
  })
}

afterEach(() => {
  for (const repository of repositories.splice(0)) {
    rmSync(repository, { force: true, recursive: true })
  }
})

describe("migration immutability check", () => {
  it("allows new migrations and unrelated changes", () => {
    const { base, repository } = createRepository()
    write(repository, "app/migrations/002.ts", "export const version = 2\n")
    write(repository, "app/src/index.ts", "export const changed = true\n")
    commit(repository)

    assert.equal(check(repository, base).status, 0)
  })

  for (const [name, mutate] of [
    [
      "modifications",
      (repository) => write(repository, "app/migrations/001.ts", "changed\n"),
    ],
    [
      "deletions",
      (repository) => git(repository, "rm", "app/migrations/001.ts"),
    ],
    [
      "renames",
      (repository) =>
        git(repository, "mv", "app/migrations/001.ts", "app/renamed.ts"),
    ],
    [
      "type changes",
      (repository) => {
        rmSync(path.join(repository, "app/migrations/001.ts"))
        symlinkSync(
          "../target.ts",
          path.join(repository, "app/migrations/001.ts")
        )
      },
    ],
    [
      "copies",
      (repository) => {
        write(repository, "app/src/copied.ts", "export const version = 1\n")
      },
    ],
  ]) {
    it(`rejects ${name} of committed migrations`, () => {
      const { base, repository } = createRepository()
      mutate(repository)
      commit(repository)

      const result = check(repository, base)
      assert.equal(result.status, 1)
      assert.match(result.stderr, /app\/migrations\/001\.ts/u)
    })
  }
})
