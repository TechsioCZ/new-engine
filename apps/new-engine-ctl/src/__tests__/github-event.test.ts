import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "vitest"

import { resolveGitHubPreviewHeadBranch } from "../github-event.js"

async function withoutBranchEnv(callback: () => Promise<void>): Promise<void> {
  const originalPreviewBranch = process.env.ZANE_PREVIEW_GIT_BRANCH
  const originalHeadRef = process.env.GITHUB_HEAD_REF
  Reflect.deleteProperty(process.env, "ZANE_PREVIEW_GIT_BRANCH")
  Reflect.deleteProperty(process.env, "GITHUB_HEAD_REF")

  try {
    await callback()
  } finally {
    if (typeof originalPreviewBranch === "undefined") {
      Reflect.deleteProperty(process.env, "ZANE_PREVIEW_GIT_BRANCH")
    } else {
      process.env.ZANE_PREVIEW_GIT_BRANCH = originalPreviewBranch
    }
    if (typeof originalHeadRef === "undefined") {
      Reflect.deleteProperty(process.env, "GITHUB_HEAD_REF")
    } else {
      process.env.GITHUB_HEAD_REF = originalHeadRef
    }
  }
}

async function withEventFile(
  event: unknown,
  callback: (path: string) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "new-engine-ctl-event-"))
  const path = join(directory, "event.json")
  await writeFile(path, JSON.stringify(event), "utf8")

  try {
    await callback(path)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}

test("resolves PR head branch from workflow_run pull request payload", async () => {
  await withoutBranchEnv(async () => {
    await withEventFile(
      {
        workflow_run: {
          head_branch: "master",
          pull_requests: [
            {
              head: {
                ref: "ci/pipeline-smoke-20260428",
              },
            },
          ],
        },
      },
      async (path) => {
        const branch = await resolveGitHubPreviewHeadBranch(path)

        expect(branch).toBe("ci/pipeline-smoke-20260428")
      }
    )
  })
})

test("falls back to workflow_run head_branch when PR head ref is unavailable", async () => {
  await withoutBranchEnv(async () => {
    await withEventFile(
      {
        workflow_run: {
          head_branch: "ci/pipeline-smoke-20260428",
          pull_requests: [],
        },
      },
      async (path) => {
        const branch = await resolveGitHubPreviewHeadBranch(path)

        expect(branch).toBe("ci/pipeline-smoke-20260428")
      }
    )
  })
})

test("explicit preview branch env overrides event payload", async () => {
  await withoutBranchEnv(async () => {
    process.env.ZANE_PREVIEW_GIT_BRANCH = "manual-preview-branch"

    await withEventFile(
      {
        workflow_run: {
          head_branch: "master",
        },
      },
      async (path) => {
        const branch = await resolveGitHubPreviewHeadBranch(path)

        expect(branch).toBe("manual-preview-branch")
      }
    )
  })
})
