import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import nodePath from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { resolveGitHubPreviewHeadBranch } from "../github-event.js"

const createEventFile = async (event: unknown) => {
  const directory = await mkdtemp(
    nodePath.join(tmpdir(), "new-engine-ctl-event-"),
  )
  const eventPath = nodePath.join(directory, "event.json")
  await writeFile(eventPath, JSON.stringify(event), "utf-8")
  return { directory, eventPath }
}

describe("github-event", () => {
  let originalPreviewBranch: string | undefined
  let originalHeadRef: string | undefined

  beforeEach(() => {
    originalPreviewBranch = process.env.ZANE_PREVIEW_GIT_BRANCH
    originalHeadRef = process.env.GITHUB_HEAD_REF
    Reflect.deleteProperty(process.env, "ZANE_PREVIEW_GIT_BRANCH")
    Reflect.deleteProperty(process.env, "GITHUB_HEAD_REF")
  })

  afterEach(() => {
    if (originalPreviewBranch === undefined) {
      Reflect.deleteProperty(process.env, "ZANE_PREVIEW_GIT_BRANCH")
    } else {
      process.env.ZANE_PREVIEW_GIT_BRANCH = originalPreviewBranch
    }
    if (originalHeadRef === undefined) {
      Reflect.deleteProperty(process.env, "GITHUB_HEAD_REF")
    } else {
      process.env.GITHUB_HEAD_REF = originalHeadRef
    }
  })

  test("resolves PR head branch from workflow_run pull request payload", async () => {
    const { directory, eventPath } = await createEventFile({
      workflow_run: {
        head_branch: "master",
        pull_requests: [{ head: { ref: "ci/pipeline-smoke-20260428" } }],
      },
    })
    try {
      await expect(resolveGitHubPreviewHeadBranch(eventPath)).resolves.toBe(
        "ci/pipeline-smoke-20260428",
      )
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  test("falls back to workflow_run head_branch when PR head ref is unavailable", async () => {
    const { directory, eventPath } = await createEventFile({
      workflow_run: {
        head_branch: "ci/pipeline-smoke-20260428",
        pull_requests: [],
      },
    })
    try {
      await expect(resolveGitHubPreviewHeadBranch(eventPath)).resolves.toBe(
        "ci/pipeline-smoke-20260428",
      )
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  test("explicit preview branch env overrides event payload", async () => {
    process.env.ZANE_PREVIEW_GIT_BRANCH = "manual-preview-branch"
    const { directory, eventPath } = await createEventFile({
      workflow_run: { head_branch: "master" },
    })
    try {
      await expect(resolveGitHubPreviewHeadBranch(eventPath)).resolves.toBe(
        "manual-preview-branch",
      )
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })
})
