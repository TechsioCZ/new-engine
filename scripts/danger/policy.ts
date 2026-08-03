export const REVIEWERS = {
  frontend: "KaiUweCZE",
  infrastructure: "RedEyeCZ",
} as const

const CONVENTIONAL_TITLE =
  /^(?:build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(?:\([a-z0-9][a-z0-9._/-]*\))?!?: .+$/i
const TEST_FILE =
  /(?:^|\/)(?:__tests__|test|tests)\/|\.(?:spec|test)\.[cm]?[jt]sx?$/
const SOURCE_FILE = /^(?:apps|libs)\/.+\.[cm]?[jt]sx?$/
const MIGRATION_FILE = /(?:^|\/)migrations?(?:\/|$)/
const PACKAGE_MANIFEST = /(?:^|\/)package\.json$/

export interface PullRequestPolicyInput {
  additions: number
  authorLogin: string
  body: string
  changedFiles: number
  createdFiles: readonly string[]
  draft: boolean
  files: readonly string[]
  modifiedFiles: readonly string[]
  reviewerLogins: readonly string[]
  title: string
}

export interface PullRequestPolicyResult {
  failures: string[]
  requiredReviewers: string[]
  warnings: string[]
}

function isInfrastructureFile(file: string): boolean {
  return (
    file === ".mise.toml" ||
    file === ".npmrc" ||
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file.startsWith(".github/workflows/") ||
    /(?:^|\/)Dockerfile(?:\.[^/]+)?$/.test(file) ||
    /(?:^|\/)docker-compose(?:\.[^/]+)?\.ya?ml$/.test(file) ||
    file === "scripts/build-medusa.sh" ||
    file === "scripts/install-storybook-playwright.mjs" ||
    file === "scripts/dev/run-pnpm-toolchain.sh"
  )
}

function isFrontendFile(file: string): boolean {
  return (
    file.startsWith("libs/ui/") ||
    file.startsWith("libs/analytics/") ||
    file.startsWith("libs/storefront-data/") ||
    file.startsWith("apps/frontend-demo/") ||
    file.startsWith("apps/herbatika/") ||
    file.startsWith("apps/n1/") ||
    file.startsWith("apps/payload/")
  )
}

function isMeaningfulBody(body: string): boolean {
  const normalized = body
    .replaceAll(/<!--(?:.|\n)*?-->/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()

  return normalized.length >= 40
}

function addBlockingFinding(
  result: PullRequestPolicyResult,
  draft: boolean,
  finding: string
): void {
  if (draft) {
    result.warnings.push(`[draft] ${finding}`)
    return
  }

  result.failures.push(finding)
}

function collectRequiredReviewers(files: readonly string[]): string[] {
  const reviewers = new Set<string>()

  if (files.some(isInfrastructureFile)) {
    reviewers.add(REVIEWERS.infrastructure)
  }

  if (files.some(isFrontendFile)) {
    reviewers.add(REVIEWERS.frontend)
  }

  return [...reviewers]
}

export function evaluatePullRequestPolicy(
  input: PullRequestPolicyInput
): PullRequestPolicyResult {
  const result: PullRequestPolicyResult = {
    failures: [],
    requiredReviewers: collectRequiredReviewers(input.files),
    warnings: [],
  }

  if (!CONVENTIONAL_TITLE.test(input.title.trim())) {
    addBlockingFinding(
      result,
      input.draft,
      "Use a Conventional Commit PR title, for example `fix(checkout): preserve selected payment provider`."
    )
  }

  if (!isMeaningfulBody(input.body)) {
    addBlockingFinding(
      result,
      input.draft,
      "Add a meaningful PR description (at least 40 non-template characters) covering intent and validation."
    )
  }

  const changedLines = input.additions
  if (input.changedFiles > 25 || changedLines > 1000) {
    result.warnings.push(
      `Large PR: ${input.changedFiles} files and ${changedLines} added lines. Explain why the change cannot be split and give reviewers a review order.`
    )
  }

  const changesSource = input.files.some((file) => SOURCE_FILE.test(file))
  const changesTests = input.files.some((file) => TEST_FILE.test(file))
  if (changesSource && !changesTests) {
    result.warnings.push(
      "Source changed without test changes. Add durable regression coverage or explain why existing tests are sufficient."
    )
  }

  const editedMigrations = input.modifiedFiles.filter((file) =>
    MIGRATION_FILE.test(file)
  )
  if (editedMigrations.length > 0) {
    addBlockingFinding(
      result,
      input.draft,
      `Do not edit existing migrations; add a new migration instead: ${editedMigrations.join(", ")}`
    )
  }

  const changesManifest = input.files.some((file) =>
    PACKAGE_MANIFEST.test(file)
  )
  const changesLockfile = input.files.includes("pnpm-lock.yaml")
  if (changesManifest && !changesLockfile) {
    result.warnings.push(
      "A package manifest changed without `pnpm-lock.yaml`. Confirm the change is script/metadata-only or update the lockfile."
    )
  }

  const presentReviewers = new Set(
    input.reviewerLogins.map((login) => login.toLowerCase())
  )
  const authorLogin = input.authorLogin.toLowerCase()

  for (const reviewer of result.requiredReviewers) {
    const reviewerLogin = reviewer.toLowerCase()
    if (reviewerLogin === authorLogin) {
      result.warnings.push(
        `@${reviewer} owns this change area but authored the PR; request another maintainer as a substitute reviewer.`
      )
      continue
    }

    if (!presentReviewers.has(reviewerLogin)) {
      addBlockingFinding(
        result,
        input.draft,
        `Request @${reviewer} for ${reviewer === REVIEWERS.infrastructure ? "pnpm/CI/Docker infrastructure" : "frontend/UI"} changes.`
      )
    }
  }

  return result
}
