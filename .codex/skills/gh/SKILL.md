---
name: github-review-loop
description: GitHub PR review loop for CodeRabbit/other reviewers. Use when managing PRs, resolving threads, replying inline, or iterating push→review→fix.
---

# GitHub Review Loop
## Order
1) `gh` CLI first.
2) If CLI can’t post/reply/resolve → REST via `gh api` (no raw curl).
3) GraphQL only when REST lacks data (ids, threads, resolve).
4) dev-browser only if CLI/REST blocked.

## Loop invariant
- Not done until **zero open PR conversations** (incl nitpicks) and **zero unresolved CodeRabbit comments**.
- If needs user judgment → stop, ask; don’t call done.
- Always re-poll after wait; if new review appears, continue loop. Never stop mid-loop.

## Loop (repeat until zero open threads)
- push
- ensure PR (create if needed)
- wait 5 min for CodeRabbit
- pull all comments/threads (incl nitpicks)
- per comment: analyze → fix (default) or close w/ brief rationale
- implement → commit → push
- re-check; resolve/reply
- repeat

## Commands
### gh CLI
- `gh pr view <PR#> --json reviewThreads,comments,reviews`
- `gh pr checks <PR#>`
- `gh pr comment <PR#> -b "..."`
- `gh pr create ...`

### REST (fallback via `gh api`)
- reply: `gh api -X POST repos/{o}/{r}/pulls/{pr}/comments -F in_reply_to=<comment_db_id> -F body="..."`
- update (avoid noise): `gh api -X PATCH repos/{o}/{r}/pulls/comments/{comment_db_id} -F body="..."`

### GraphQL (only when needed)
- get threads + ids; resolve threads (`resolveReviewThread`)
- map node id → `databaseId` for REST
- fields: `reviewThreads { nodes { id isResolved comments { nodes { id databaseId body path line } } } }`

## Rules
- Resolve only if fixed or explicitly closed w/ reason.
- Fix > close; if close, brief rationale.
- Prefer update existing comment (less noise).
- PR description: never include literal `\n`; use real newlines or single-line.

## Output
- After each loop: open threads count + remaining CodeRabbit comments + next action.
- Done line: “No open conversations remain.”