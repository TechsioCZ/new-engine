import { readFile } from "node:fs/promises"

import { z } from "zod"

const githubBranchSchema = z.string().transform((branch) => branch.trim())

const workflowRunPullRequestEventSchema = z.object({
  workflow_run: z.object({
    pull_requests: z.array(
      z.object({
        head: z.object({
          ref: githubBranchSchema,
        }),
      }),
    ),
  }),
})

const workflowRunEventSchema = z.object({
  workflow_run: z.object({
    head_branch: githubBranchSchema,
  }),
})

const pullRequestEventSchema = z.object({
  pull_request: z.object({
    head: z.object({
      ref: githubBranchSchema,
    }),
  }),
})

const resolveEventBranch = (event: unknown): string => {
  const workflowRunPullRequestResult =
    workflowRunPullRequestEventSchema.safeParse(event)
  if (workflowRunPullRequestResult.success) {
    const pullRequest =
      workflowRunPullRequestResult.data.workflow_run.pull_requests.at(0)
    if (pullRequest?.head.ref !== undefined && pullRequest.head.ref !== "") {
      return pullRequest.head.ref
    }
  }

  const workflowRunResult = workflowRunEventSchema.safeParse(event)
  if (
    workflowRunResult.success &&
    workflowRunResult.data.workflow_run.head_branch !== ""
  ) {
    return workflowRunResult.data.workflow_run.head_branch
  }

  const pullRequestResult = pullRequestEventSchema.safeParse(event)
  return pullRequestResult.success
    ? pullRequestResult.data.pull_request.head.ref
    : ""
}

export const resolveGitHubPreviewHeadBranch = async (
  eventPath = process.env["GITHUB_EVENT_PATH"],
): Promise<string> => {
  if (
    process.env["ZANE_PREVIEW_GIT_BRANCH"]?.trim() !== undefined &&
    process.env["ZANE_PREVIEW_GIT_BRANCH"].trim() !== ""
  ) {
    return process.env["ZANE_PREVIEW_GIT_BRANCH"].trim()
  }

  if (
    process.env["GITHUB_HEAD_REF"]?.trim() !== undefined &&
    process.env["GITHUB_HEAD_REF"].trim() !== ""
  ) {
    return process.env["GITHUB_HEAD_REF"].trim()
  }

  if (eventPath === undefined || eventPath === "") {
    return ""
  }

  let event: unknown

  try {
    event = JSON.parse(await readFile(eventPath, "utf-8"))
  } catch {
    return ""
  }

  return resolveEventBranch(event)
}
