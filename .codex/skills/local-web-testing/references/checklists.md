# Local Web Testing Checklists

Use these checklists to keep manual testing consistent. Keep notes concise and focused on reproduction steps and evidence.

## Smoke Pass

- Open the base URL and verify the page loads without blank content.
- Navigate primary pages via top nav, sidebar, or main CTAs.
- Trigger at least one primary CTA or flow end-to-end.
- Validate critical forms submit and show a clear success state.
- Look for obvious layout breaks, missing assets, or broken links.

## Authentication

- Verify login with provided credentials.
- If registration is allowed, create a new account and then log in.
- Confirm logout returns to a public state and private pages are blocked.
- If password reset is in scope, verify the request path and success messaging.

## DevTools Triage

- Console: capture errors, stack traces, and noisy warnings.
- Network: identify failed requests, status codes, and slow calls.
- Elements: confirm DOM structure for layout or missing content issues.
- Storage: check cookies or local storage only when auth/session bugs appear.

## Screenshots

- Capture a screenshot for each failure and for key checkpoints.
- Name files by flow and step (for example `checkout-error-2.png`).
- Record the URL, time, and short description for each capture.

## Storybook (if requested)

- Start Storybook via `pnpm storybook` or the repo script.
- Open key components and verify main states (default, hover, error).
- Screenshot any broken layout or missing assets.
