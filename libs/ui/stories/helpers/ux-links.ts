/**
 * Link mapping for the UX guidelines pages (see ux-markdown.tsx).
 *
 * The markdown lives in the skills (`libs/ui/skills/<name>-usage/references/ux.md` and
 * `libs/ui/skills/ux-guidelines/references/<topic>.md`) and links relative to the skill bundle.
 * These helpers turn those links into Storybook docs paths. Kept free of Storybook imports so the
 * ux-docs test can run them in Node.
 */

/** UX/ pattern pages: reference file name → Storybook docs title. */
export const UX_TOPIC_TITLES: Record<string, string> = {
  introduction: "UX/Introduction",
  "ux-writing": "UX/Writing",
  formatting: "UX/Formatting",
  states: "UX/States",
  "feedback-and-actions": "UX/Feedback and actions",
  "component-selection": "UX/Component selection",
  "value-lifecycle": "UX/Value lifecycle",
  accessibility: "UX/Accessibility",
}

/** Components with a UX guidelines page: usage skill name → component story title. */
export const UX_COMPONENT_TITLES: Record<string, string> = {
  button: "Atoms/Button",
  input: "Atoms/Input",
  dialog: "Molecules/Dialog",
  select: "Molecules/Select",
  "data-table": "Organisms/DataTable",
}

const NON_ID_CHARACTERS = /[^a-z0-9]+/g
const EDGE_DASHES = /^-+|-+$/g
const PASS_THROUGH_LINK = /^(?:https?:|mailto:|#|\?)/

export const toStoryId = (title: string) =>
  title.toLowerCase().replace(NON_ID_CHARACTERS, "-").replace(EDGE_DASHES, "")

const COMPONENT_LINK = /(?:^|\/)([a-z0-9-]+)-usage\/references\/ux\.md(?:#.*)?$/
const TOPIC_LINK = /(?:^|\/)([a-z0-9-]+)\.md(?:#.*)?$/
const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
const HTML_COMMENT = /<!--[\s\S]*?-->\n?/g

/** Map a skill-relative link to a Storybook docs path, or null when no page exists. */
export function toStorybookHref(href: string): string | null {
  if (PASS_THROUGH_LINK.test(href)) {
    return href
  }
  const component = COMPONENT_LINK.exec(href)?.[1]
  if (component) {
    const title = UX_COMPONENT_TITLES[component]
    return title ? `?path=/docs/${toStoryId(title)}--ux-guidelines` : null
  }
  const topic = TOPIC_LINK.exec(href)?.[1]
  if (topic && topic !== "ux" && UX_TOPIC_TITLES[topic]) {
    return `?path=/docs/${toStoryId(UX_TOPIC_TITLES[topic])}--docs`
  }
  return null
}

/** Rewrite skill-relative links and drop source comments; exported for tests. */
export function toStorybookMarkdown(source: string): string {
  return source
    .replace(HTML_COMMENT, "")
    .replace(MARKDOWN_LINK, (_match, text: string, href: string) => {
      const target = toStorybookHref(href)
      return target ? `[${text}](${target})` : text
    })
}
