import { danger, fail, warn } from "danger"

import { createPullRequestPolicyInput } from "./scripts/danger/github-context.ts"
import { evaluatePullRequestPolicy } from "./scripts/danger/policy.ts"

const input = createPullRequestPolicyInput(danger)

if (input) {
  const result = evaluatePullRequestPolicy(input)

  for (const finding of result.failures) {
    fail(finding)
  }

  for (const finding of result.warnings) {
    warn(finding)
  }
} else {
  warn(
    "GitHub pull request metadata is unavailable; skipped GitHub-specific PR policy checks."
  )
}
