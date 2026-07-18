import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  hasUploadedCommits,
  parsePushLines,
  touchesDangerPolicy,
} from "./files.mjs"

const SHA = "1234567890123456789012345678901234567890"
const ZERO = "0000000000000000000000000000000000000000"

describe("hook file helpers", () => {
  it("parses valid push lines and ignores malformed input", () => {
    assert.deepEqual(
      parsePushLines(
        `refs/heads/main ${SHA} refs/heads/main ${ZERO}\nmalformed\n`
      ),
      [
        {
          localRef: "refs/heads/main",
          localSha: SHA,
          remoteRef: "refs/heads/main",
          remoteSha: ZERO,
        },
      ]
    )
  })

  it("distinguishes uploaded commits from deletions and empty pushes", () => {
    assert.equal(hasUploadedCommits(""), false)
    assert.equal(
      hasUploadedCommits(`(delete) ${ZERO} refs/heads/old ${SHA}\n`),
      false
    )
    assert.equal(
      hasUploadedCommits(`refs/heads/main ${SHA} refs/heads/main ${ZERO}\n`),
      true
    )
  })

  it("recognizes owned policy and hook files", () => {
    assert.equal(touchesDangerPolicy(["dangerfile.ts"]), true)
    assert.equal(touchesDangerPolicy(["scripts/hooks/pre-push.mjs"]), true)
    assert.equal(touchesDangerPolicy(["apps/n1/src/app/page.tsx"]), false)
  })
})
