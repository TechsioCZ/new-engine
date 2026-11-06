import { Markdown } from "@storybook/addon-docs/blocks"
import { toStorybookMarkdown } from "./ux-links"

/**
 * Renders a UX guidelines markdown file in Storybook.
 *
 * The markdown files live inside the usage skills (`libs/ui/skills/<name>-usage/references/ux.md`)
 * and the `ux-guidelines` skill (`libs/ui/skills/ux-guidelines/references/<topic>.md`), so
 * Storybook and the AI plugin read one source. Links written for the skill bundle are rewritten
 * to Storybook docs paths (see ux-links.ts); the docs anchor turns those into in-app navigation.
 */

type UxMarkdownProps = {
  /** Raw markdown, imported with `?raw`. */
  source: string
}

export function UxMarkdown({ source }: UxMarkdownProps) {
  return <Markdown>{toStorybookMarkdown(source)}</Markdown>
}
