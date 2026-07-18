import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createPullRequestPolicyInput } from "./github-context.ts"
import { evaluatePullRequestPolicy, REVIEWERS } from "./policy.ts"
import type { PullRequestPolicyInput } from "./policy.ts"

function input(
  overrides: Partial<PullRequestPolicyInput> = {}
): PullRequestPolicyInput {
  return {
    additions: 10,
    authorLogin: "author",
    body: "This change fixes checkout state and was validated with focused tests.",
    changedFiles: 2,
    createdFiles: [],
    draft: false,
    files: [
      "apps/medusa-be/src/api/route.ts",
      "apps/medusa-be/src/api/route.test.ts",
    ],
    modifiedFiles: [
      "apps/medusa-be/src/api/route.ts",
      "apps/medusa-be/src/api/route.test.ts",
    ],
    reviewerLogins: [],
    title: "fix(checkout): preserve payment state",
    ...overrides,
  }
}

describe("evaluatePullRequestPolicy", () => {
  it("accepts a focused, tested backend pull request", () => {
    assert.deepEqual(evaluatePullRequestPolicy(input()), {
      failures: [],
      requiredReviewers: [],
      warnings: [],
    })
  })

  it("requires conventional titles and meaningful descriptions", () => {
    const result = evaluatePullRequestPolicy(
      input({ body: "Fix", title: "Fix checkout" })
    )

    assert.equal(result.failures.length, 2)
  })

  it("downgrades blocking metadata findings for drafts", () => {
    const result = evaluatePullRequestPolicy(
      input({ body: "", draft: true, title: "work in progress" })
    )

    assert.deepEqual(result.failures, [])
    assert.equal(result.warnings.length, 2)
    assert.ok(result.warnings.every((warning) => warning.startsWith("[draft]")))
  })

  it("routes infrastructure and frontend changes to their owners", () => {
    const result = evaluatePullRequestPolicy(
      input({
        files: ["pnpm-lock.yaml", "libs/ui/src/atoms/button.tsx"],
        modifiedFiles: ["pnpm-lock.yaml", "libs/ui/src/atoms/button.tsx"],
      })
    )

    assert.deepEqual(result.requiredReviewers, [
      REVIEWERS.infrastructure,
      REVIEWERS.frontend,
    ])
    assert.equal(result.failures.length, 2)
  })

  it("routes every CODEOWNERS frontend area to the frontend reviewer", () => {
    for (const file of [
      "apps/payload/src/payload.config.ts",
      "libs/analytics/src/index.ts",
      "libs/storefront-data/src/auth/hooks.ts",
    ]) {
      const result = evaluatePullRequestPolicy(
        input({
          files: [file],
          modifiedFiles: [file],
          reviewerLogins: [REVIEWERS.frontend],
        })
      )

      assert.deepEqual(result.requiredReviewers, [REVIEWERS.frontend])
      assert.deepEqual(result.failures, [])
    }
  })

  it("recognizes requested or completed reviewers case-insensitively", () => {
    const result = evaluatePullRequestPolicy(
      input({
        files: [".github/workflows/ci.yml", "apps/herbatika/src/app/page.tsx"],
        modifiedFiles: [
          ".github/workflows/ci.yml",
          "apps/herbatika/src/app/page.tsx",
        ],
        reviewerLogins: ["REDEYECZ", "kaiuwecze"],
      })
    )

    assert.deepEqual(result.failures, [])
  })

  it("blocks edits to existing migrations but permits new migrations", () => {
    const edited = evaluatePullRequestPolicy(
      input({
        files: ["apps/medusa-be/src/migrations/20260101.ts"],
        modifiedFiles: ["apps/medusa-be/src/migrations/20260101.ts"],
      })
    )
    const created = evaluatePullRequestPolicy(
      input({
        createdFiles: ["apps/medusa-be/src/migrations/20260718.ts"],
        files: ["apps/medusa-be/src/migrations/20260718.ts"],
        modifiedFiles: [],
      })
    )

    assert.equal(edited.failures.length, 1)
    assert.deepEqual(created.failures, [])
  })

  it("normalizes GitHub Danger context and tolerates missing optional review fields", () => {
    assert.deepEqual(
      createPullRequestPolicyInput({
        git: {
          created_files: ["new.ts"],
          deleted_files: ["old.ts"],
          modified_files: ["changed.ts"],
        },
        github: {
          pr: {
            additions: 12,
            body: null,
            changed_files: 3,
            draft: false,
            title: "fix(policy): normalize context",
            user: { login: "author" },
          },
        },
      }),
      {
        additions: 12,
        authorLogin: "author",
        body: "",
        changedFiles: 3,
        createdFiles: ["new.ts"],
        draft: false,
        files: ["new.ts", "changed.ts", "old.ts"],
        modifiedFiles: ["changed.ts"],
        reviewerLogins: [],
        title: "fix(policy): normalize context",
      }
    )
    assert.equal(createPullRequestPolicyInput({ git: {} }), undefined)
  })

  it("warns on large, untested, or unlocked source changes", () => {
    const result = evaluatePullRequestPolicy(
      input({
        additions: 1001,
        changedFiles: 26,
        files: [
          "apps/medusa-be/src/api/route.ts",
          "apps/medusa-be/package.json",
        ],
        modifiedFiles: [
          "apps/medusa-be/src/api/route.ts",
          "apps/medusa-be/package.json",
        ],
      })
    )

    assert.equal(result.warnings.length, 3)
  })
})
