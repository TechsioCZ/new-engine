import { z } from "zod"

import type { PullRequestPolicyInput } from "./policy.ts"

const stringWithFallbackSchema = z
  .unknown()
  .transform((value) => (typeof value === "string" ? value : ""))
const numberWithFallbackSchema = z
  .unknown()
  .transform((value) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0,
  )
const booleanWithFallbackSchema = z
  .unknown()
  .transform((value) => value === true)
const fileListSchema = z
  .unknown()
  .transform((value): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [],
  )
const loginSchema = z.object({ login: z.string().min(1) })
const pullRequestSchema = z.object({
  additions: numberWithFallbackSchema,
  body: stringWithFallbackSchema,
  changed_files: numberWithFallbackSchema,
  draft: booleanWithFallbackSchema,
  title: stringWithFallbackSchema,
  user: z
    .object({ login: stringWithFallbackSchema })
    .or(z.unknown().transform(() => ({ login: "" }))),
})
const gitContextSchema = z.object({
  created_files: fileListSchema,
  deleted_files: fileListSchema,
  modified_files: fileListSchema,
})
const emptyGitContext = {
  created_files: [],
  deleted_files: [],
  modified_files: [],
}
const unknownArraySchema = z
  .array(z.unknown())
  .or(z.unknown().transform((): unknown[] => []))
const reviewerContextSchema = z.object({
  users: unknownArraySchema,
})
const dangerContextSchema = z.object({
  git: gitContextSchema.or(z.unknown().transform(() => emptyGitContext)),
  github: z.object({
    pr: pullRequestSchema,
    requested_reviewers: reviewerContextSchema.or(
      z.unknown().transform(() => ({ users: [] })),
    ),
    reviews: unknownArraySchema,
  }),
})

const decodeLogins = (values: readonly unknown[]): string[] =>
  values.flatMap((value) => {
    const result = loginSchema.safeParse(value)
    return result.success ? [result.data.login] : []
  })

const reviewSchema = z.object({ user: loginSchema })
const decodeReviewLogin = (value: unknown): string[] => {
  const result = reviewSchema.safeParse(value)
  return result.success ? [result.data.user.login] : []
}

export const createPullRequestPolicyInput = (
  dsl: unknown,
): PullRequestPolicyInput | undefined => {
  const decoded = dangerContextSchema.safeParse(dsl)
  if (!decoded.success) {
    return undefined
  }

  const { git, github } = decoded.data
  const { pr } = github
  const reviewerLogins = [
    ...decodeLogins(github.requested_reviewers.users),
    ...github.reviews.flatMap(decodeReviewLogin),
  ]

  return {
    additions: pr.additions,
    authorLogin: pr.user.login,
    body: pr.body,
    changedFiles: pr.changed_files,
    createdFiles: git.created_files,
    draft: pr.draft,
    files: [
      ...new Set([
        ...git.created_files,
        ...git.modified_files,
        ...git.deleted_files,
      ]),
    ],
    modifiedFiles: git.modified_files,
    reviewerLogins: [...new Set(reviewerLogins)],
    title: pr.title,
  }
}
