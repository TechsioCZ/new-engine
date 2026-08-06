---
name: safe-html-usage
description: >
  Use when an app must render trusted or external rich-text HTML through @techsio/ui-kit without dangerouslySetInnerHTML, while preserving SSR markup and applying an explicit tag and attribute policy.
type: component-usage
library: "@techsio/ui-kit"
library_version: "0.3.2"
component: SafeHtml
component_version: "1.0.0"
sources:
  - "libs/ui/src/atoms/safe-html.tsx"
  - "libs/ui/test/safe-html.test.tsx"
  - "libs/ui/stories/atoms/safe-html.stories.tsx"
---

# SafeHtml usage

Use `SafeHtml` only for rich text that must retain markup. Plain text should remain ordinary React text.

## Setup

Import the explicit atom subpath and define the narrowest policy near the domain that owns the content:

```tsx
import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"
import type { SafeHtmlPolicy } from "@techsio/ui-kit/atoms/safe-html"

const ARTICLE_POLICY: SafeHtmlPolicy = {
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedTags: ["a", "em", "p", "strong"],
}

export const Article = ({ html }: { html: string }) => (
  <article>
    <SafeHtml html={html} policy={ARTICLE_POLICY} />
  </article>
)
```

## Safety contract

- `SafeHtml` sanitizes first, parses the sanitized fragment, validates every rendered tag and attribute against the explicit policy, and creates React nodes.
- Event-handler attributes, inline `style`, unsafe URL schemes, scripts, frames, objects, styles, and templates remain forbidden even if a caller lists them.
- Relative URLs and `http`, `https`, `mailto`, and `tel` URLs are accepted. `_blank` links receive `noopener noreferrer`.
- Use `policy.sanitize` only to apply a stricter app/domain sanitizer before the shared fail-closed sanitizer. It never replaces the shared validation pass.
- Keep presentation on the surrounding semantic element so `SafeHtml` returns only the sanitized content nodes and preserves the owner’s SSR wrapper markup.

## Do not

- Do not use `dangerouslySetInnerHTML`, casts, event/style attributes, permissive wildcard policies, or app-to-app imports.
- Do not treat backend/CMS publication as sanitization.
- Do not allow a tag or attribute merely because one payload currently contains it; document the content requirement and add a malicious-payload regression test.

## Validation

```sh
pnpm exec vitest run libs/ui/test/safe-html.test.tsx
pnpm exec tsc --noEmit -p scripts/typescript/projects/libs/ui/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/libs/ui/tsconfig.json
pnpm -C libs/ui build
pnpm -C libs/ui build:storybook
```
