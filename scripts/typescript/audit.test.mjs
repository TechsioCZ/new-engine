/// <reference types="node" />

import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { auditRepository } from "./audit.mjs"

const baseConfigPath = "tsconfig.base.json"
const gitExecutable = "/usr/bin/git"
const rootConfigPath = "tsconfig.json"
const sourceConfigPath = "apps/example/tsconfig.json"
const wrapperConfigPath =
  "scripts/typescript/projects/apps/example/tsconfig.json"
const repositoryNodeModules = path.resolve(
  import.meta.dirname,
  "../../node_modules",
)

/** @param {string} root @param {string} relativePath @param {unknown} value */
const writeJson = (root, relativePath, value) => {
  const filePath = path.join(root, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, undefined, 2)}\n`)
}

/** @param {string} root @param {string} relativePath */
const readJson = (root, relativePath) => {
  /** @type {unknown} */
  const value = JSON.parse(readFileSync(path.join(root, relativePath), "utf-8"))
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value
  }
  throw new TypeError(`${relativePath} must contain an object`)
}

/** @returns {string} Temporary fixture repository root. */
const createFixture = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "typescript-audit-"))
  writeFileSync(path.join(root, ".gitignore"), "node_modules\n")
  symlinkSync(repositoryNodeModules, path.join(root, "node_modules"))
  writeJson(root, baseConfigPath, {
    compilerOptions: {
      forceConsistentCasingInFileNames: true,
      noUncheckedSideEffectImports: true,
    },
    extends: "@tsconfig/strictest/tsconfig.json",
  })
  writeJson(root, rootConfigPath, {
    extends: "./tsconfig.base.json",
    files: [],
    references: [{ path: `./${wrapperConfigPath}` }],
  })
  writeJson(root, sourceConfigPath, {
    compilerOptions: { noEmit: true },
    extends: "../../tsconfig.base.json",
    files: ["index.ts"],
  })
  writeFileSync(path.join(root, "apps/example/index.ts"), "export {}\n")
  writeJson(root, wrapperConfigPath, {
    extends: "../../../../../apps/example/tsconfig.json",
  })
  execFileSync(gitExecutable, ["init", "--quiet"], { cwd: root })
  execFileSync(gitExecutable, ["add", "."], { cwd: root })
  return root
}

/** @param {(root: string) => void} assertion - Assertion run inside an owned fixture. */
const usingFixture = (assertion) => {
  const root = createFixture()
  try {
    assertion(root)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

/** @param {string} root - Fixture repository root. */
const runAudit = (root) =>
  auditRepository({ repositoryRoot: root, verifyCompilerResolution: false })

void test("accepts the single base hierarchy and exact mirror coverage", () => {
  usingFixture((root) => {
    assert.deepEqual(runAudit(root), { sourceConfigCount: 1, wrapperCount: 1 })
  })
})

void test("rejects a config with missing base ancestry", () => {
  usingFixture((root) => {
    const source = readJson(root, sourceConfigPath)
    delete source.extends
    writeJson(root, sourceConfigPath, source)
    assert.throws(
      () => runAudit(root),
      /missing tsconfig\.base\.json ancestry/u,
    )
  })
})

void test("detects inheritance cycles before enforcing direct parents", () => {
  usingFixture((root) => {
    writeJson(root, baseConfigPath, {
      compilerOptions: {
        forceConsistentCasingInFileNames: true,
        noUncheckedSideEffectImports: true,
      },
      extends: "./apps/example/tsconfig.json",
    })
    assert.throws(() => runAudit(root), /inheritance cycle/u)
  })
})

void test("rejects extends references outside the repository", () => {
  usingFixture((root) => {
    const externalRoot = mkdtempSync(
      path.join(os.tmpdir(), "typescript-audit-outside-"),
    )
    try {
      const externalConfig = path.join(externalRoot, "tsconfig.json")
      writeJson(externalRoot, rootConfigPath, {})
      const source = readJson(root, sourceConfigPath)
      source.extends = externalConfig
      writeJson(root, sourceConfigPath, source)
      assert.throws(() => runAudit(root), /extends outside the repository/u)
    } finally {
      rmSync(externalRoot, { force: true, recursive: true })
    }
  })
})

void test("rejects strict option weakening", () => {
  usingFixture((root) => {
    const source = readJson(root, sourceConfigPath)
    source.compilerOptions = { noEmit: true, strictNullChecks: false }
    writeJson(root, sourceConfigPath, source)
    assert.throws(
      () => runAudit(root),
      /weakens strict option strictNullChecks/u,
    )
  })
})

void test("rejects unmirrored shadow configs", () => {
  usingFixture((root) => {
    writeJson(root, "apps/example/tsconfig.shadow.json", {
      extends: "../../tsconfig.base.json",
      files: ["index.ts"],
    })
    execFileSync(gitExecutable, ["add", "."], { cwd: root })
    assert.throws(() => runAudit(root), /unmirrored shadow config/u)
  })
})

void test("rejects unnecessary duplicated strict options in projects", () => {
  usingFixture((root) => {
    const source = readJson(root, sourceConfigPath)
    source.compilerOptions = { noEmit: true, noUncheckedIndexedAccess: true }
    writeJson(root, sourceConfigPath, source)
    assert.throws(
      () => runAudit(root),
      /unnecessarily duplicates strict option noUncheckedIndexedAccess/u,
    )
  })
})

void test("rejects preset options duplicated in the base", () => {
  usingFixture((root) => {
    const base = readJson(root, baseConfigPath)
    base.compilerOptions = {
      forceConsistentCasingInFileNames: true,
      noUncheckedIndexedAccess: true,
      noUncheckedSideEffectImports: true,
    }
    writeJson(root, baseConfigPath, base)
    assert.throws(
      () => runAudit(root),
      /unnecessarily duplicates strict preset option noUncheckedIndexedAccess/u,
    )
  })
})

void test("rejects a third authored policy config", () => {
  usingFixture((root) => {
    writeJson(root, "tsconfig.policy.json", {
      extends: "./tsconfig.base.json",
      files: [],
    })
    execFileSync(gitExecutable, ["add", "."], { cwd: root })
    assert.throws(() => runAudit(root), /unmirrored shadow config/u)
  })
})
