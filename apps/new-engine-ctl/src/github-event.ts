import { readFile } from "node:fs/promises"

function readNestedString(value: unknown, path: string[]): string {
  let current = value

  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) {
        return ""
      }

      current = current[index]
      continue
    }

    if (!current || typeof current !== "object") {
      return ""
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === "string" ? current.trim() : ""
}

export async function resolveGitHubPreviewHeadBranch(
  eventPath = process.env.GITHUB_EVENT_PATH
): Promise<string> {
  if (process.env.ZANE_PREVIEW_GIT_BRANCH?.trim()) {
    return process.env.ZANE_PREVIEW_GIT_BRANCH.trim()
  }

  if (process.env.GITHUB_HEAD_REF?.trim()) {
    return process.env.GITHUB_HEAD_REF.trim()
  }

  if (!eventPath) {
    return ""
  }

  let event: unknown

  try {
    event = JSON.parse(await readFile(eventPath, "utf8"))
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
