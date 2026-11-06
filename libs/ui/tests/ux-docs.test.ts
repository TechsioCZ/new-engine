import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  toStorybookHref,
  toStorybookMarkdown,
  UX_COMPONENT_TITLES,
  UX_TOPIC_TITLES,
} from "../stories/helpers/ux-links"

/*
 * UX guidelines have one source: markdown inside the skills. Storybook renders it through
 * `*.ux.mdx` / `stories/ux/*.mdx` pages, the AI plugin bundles it. These checks keep the two
 * views complete and their links valid.
 */

const USAGE_SUFFIX = /-usage$/
const MD_SUFFIX = /\.md$/
const ATTACHED_META = /<Meta of=\{\w+\} name="UX guidelines" \/>/
const STORIES_IMPORT = /from "\.\/([\w-]+)\.stories"/
const RELATIVE_LINK = /\[[^\]]+\]\(((?!https?:|mailto:|#)[^)\s]+)\)/g

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const skillsDir = join(uiRoot, "skills")
const storiesDir = join(uiRoot, "stories")
const guidelinesDir = join(skillsDir, "ux-guidelines", "references")

const listFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(dir, entry.name))
      : [join(dir, entry.name)]
  )

const componentPages = readdirSync(skillsDir)
  .filter(
    (name) =>
      name.endsWith("-usage") &&
      existsSync(join(skillsDir, name, "references", "ux.md"))
  )
  .map((name) => name.replace(USAGE_SUFFIX, ""))

const topicPages = readdirSync(guidelinesDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.replace(MD_SUFFIX, ""))

const mdxPages = listFiles(storiesDir).filter((file) => file.endsWith(".mdx"))
const mdxImporting = (fragment: string) =>
  mdxPages.filter((file) => readFileSync(file, "utf8").includes(fragment))

const uxFiles = [
  ...componentPages.map((name) =>
    join(skillsDir, `${name}-usage`, "references", "ux.md")
  ),
  ...topicPages.map((name) => join(guidelinesDir, `${name}.md`)),
]

describe("UX guidelines pages", () => {
  it.each(componentPages)("%s has one attached Storybook page", (name) => {
    const pages = mdxImporting(`skills/${name}-usage/references/ux.md?raw`)
    expect(pages).toHaveLength(1)
    const page = readFileSync(pages[0] as string, "utf8")
    expect(page).toMatch(ATTACHED_META)
    const storiesImport = page.match(STORIES_IMPORT)?.[1]
    const stories = readFileSync(
      join(dirname(pages[0] as string), `${storiesImport}.stories.tsx`),
      "utf8"
    )
    expect(stories).toContain(`title: "${UX_COMPONENT_TITLES[name]}"`)
  })

  it("maps exactly the components that have a page", () => {
    expect(Object.keys(UX_COMPONENT_TITLES).sort()).toEqual(
      [...componentPages].sort()
    )
  })

  it.each(topicPages)("UX/%s has a Storybook page", (name) => {
    expect(UX_TOPIC_TITLES[name]).toBeDefined()
    const pages = mdxImporting(`skills/ux-guidelines/references/${name}.md?raw`)
    expect(pages).toHaveLength(1)
    expect(readFileSync(pages[0] as string, "utf8")).toContain(
      `<Meta title="${UX_TOPIC_TITLES[name]}" />`
    )
  })

  it.each(uxFiles.map((file) => [file.slice(uiRoot.length + 1), file]))(
    "%s records its source and links to existing files",
    (_label, file) => {
      const source = readFileSync(file, "utf8")
      expect(source.startsWith("<!-- Source: ")).toBe(true)
      for (const [, href] of source.matchAll(RELATIVE_LINK)) {
        const [path = ""] = String(href).split("#")
        const target = resolve(dirname(file), path)
        expect(existsSync(target), `${href} in ${file}`).toBe(true)
      }
    }
  )
})

describe("Storybook link mapping", () => {
  it("links component and topic pages to their docs entries", () => {
    expect(toStorybookHref("../../dialog-usage/references/ux.md")).toBe(
      "?path=/docs/molecules-dialog--ux-guidelines"
    )
    expect(toStorybookHref("../../ux-guidelines/references/states.md")).toBe(
      "?path=/docs/ux-states--docs"
    )
    expect(toStorybookHref("ux-writing.md#button-labels")).toBe(
      "?path=/docs/ux-writing--docs"
    )
  })

  it("renders links without a Storybook page as plain text", () => {
    expect(
      toStorybookMarkdown(
        "See [Tabs](../../tabs-usage/references/ux.md) and [skill](../SKILL.md)."
      )
    ).toBe("See Tabs and skill.")
  })

  it("drops the source comment and keeps external links", () => {
    expect(
      toStorybookMarkdown(
        "<!-- Source: x -->\n[UX_docs](https://github.com/TechsioCZ/UX_docs)"
      )
    ).toBe("[UX_docs](https://github.com/TechsioCZ/UX_docs)")
  })
})
