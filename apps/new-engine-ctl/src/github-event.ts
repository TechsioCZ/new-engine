import { readFile } from "node:fs/promises"

import { z } from "zod"

const unknownArraySchema = z.array(z.unknown())
const unknownRecordSchema = z.record(z.string(), z.unknown())

const readNestedString = (value: unknown, path: string[]): string => {
  let current: unknown = value

  for (const segment of path) {
    const arrayResult = unknownArraySchema.safeParse(current)
    if (arrayResult.success) {
      const index = Number(segment)
      if (!Number.isInteger(index)) {
        return ""
      }
      current = arrayResult.data.at(index)
      continue
    }

    const recordResult = unknownRecordSchema.safeParse(current)
    if (!recordResult.success) {
      return ""
    }
    current = recordResult.data[segment]
  }

  return typeof current === "string" ? current.trim() : ""
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

  return (
    readNestedString(event, [
      "workflow_run",
      "pull_requests",
      "0",
      "head",
      "ref",
    ]) ||
    readNestedString(event, ["workflow_run", "head_branch"]) ||
    readNestedString(event, ["pull_request", "head", "ref"])
  )
}
