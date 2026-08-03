import type { PullRequestPolicyInput } from "./policy.ts"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : undefined
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function collectLogins(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    const login = asRecord(item)?.login
    return typeof login === "string" && login.length > 0 ? [login] : []
  })
}

export function createPullRequestPolicyInput(
  dsl: unknown
): PullRequestPolicyInput | undefined {
  const root = asRecord(dsl)
  const github = asRecord(root?.github)
  const pullRequest = asRecord(github?.pr)

  if (!github || !pullRequest) {
    return undefined
  }

  const git = asRecord(root?.git)
  const requestedReviewers = asRecord(github.requested_reviewers)
  const reviews = Array.isArray(github.reviews) ? github.reviews : []
  const reviewerLogins = [
    ...collectLogins(requestedReviewers?.users),
    ...reviews.flatMap((review) => {
      const user = asRecord(asRecord(review)?.user)
      const login = user?.login
      return typeof login === "string" && login.length > 0 ? [login] : []
    }),
  ]
  const createdFiles = asStringArray(git?.created_files)
  const modifiedFiles = asStringArray(git?.modified_files)
  const deletedFiles = asStringArray(git?.deleted_files)

  return {
    additions: asNumber(pullRequest.additions),
    authorLogin: asString(asRecord(pullRequest.user)?.login),
    body: asString(pullRequest.body),
    changedFiles: asNumber(pullRequest.changed_files),
    createdFiles,
    draft: pullRequest.draft === true,
    files: [...new Set([...createdFiles, ...modifiedFiles, ...deletedFiles])],
    modifiedFiles,
    reviewerLogins: [...new Set(reviewerLogins)],
    title: asString(pullRequest.title),
  }
}
