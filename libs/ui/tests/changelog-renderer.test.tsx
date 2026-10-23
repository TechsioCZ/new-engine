import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import meta from "../stories/changelog/changelog.stories"

const Changelog = meta.component
const sourceFile = readFileSync(
  new URL("../stories/changelog/changelog.stories.tsx", import.meta.url),
  "utf8"
)
const rawSource =
  sourceFile.split("const CHANGELOG = `")[1]?.split("`.trim()")[0] ?? ""
const source = rawSource.replaceAll("\\`", "`").trim()
const sourceHeading = /^#{2,3} /
const continuedBullet = /^\s+\S/
const versionHeading = /^### [A-Za-z0-9]+ v\d+\.\d+\.\d+$/m
const headingPattern = /<h[23]\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/g
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")

describe("semantic changelog renderer", () => {
  it("keeps one authored source string with version-checker-readable entries", () => {
    expect(sourceFile.match(/const CHANGELOG = `/g)).toHaveLength(1)
    expect(source).toContain("## @techsio/ui-kit — Unreleased")
    expect(source).toMatch(versionHeading)
  })

  it("renders each authored heading and bullet once in the history body", () => {
    const html = renderToStaticMarkup(<Changelog />)
    const body = html.split("</nav>")[1] ?? ""
    const headings = [...body.matchAll(headingPattern)]
    const expectedHeadings = source
      .split("\n")
      .filter((line) => sourceHeading.test(line))
      .map((line) => line.replace(sourceHeading, "").replaceAll("`", ""))
    expect(headings.map((match) => text(match[2] ?? ""))).toEqual(
      expectedHeadings
    )
    const bullets: string[] = []
    for (const line of source.split("\n")) {
      if (line.startsWith("- ")) {
        bullets.push(line.slice(2))
      } else if (continuedBullet.test(line)) {
        bullets[bullets.length - 1] += ` ${line.trim()}`
      }
    }
    expect(
      [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) =>
        text(match[1] ?? "")
      )
    ).toEqual(bullets.map((bullet) => bullet.replaceAll("`", "")))
    expect(html).not.toContain("<pre")
    expect(html).toContain("<code")
  })

  it("creates deterministic unique anchors even for repeated headings and slug collisions", () => {
    const fixture =
      "## Release\n### Button v1.0.0\n- First\n### Button v1.0.0\n- Second\n### Button v1.0.0-2\n- Third\n### Button v1.0.0\n- Fourth"
    const html = renderToStaticMarkup(<Changelog source={fixture} />)
    expect(renderToStaticMarkup(<Changelog source={fixture} />)).toBe(html)
    const ids = [...html.matchAll(headingPattern)].map((match) => match[1])
    expect(ids).toEqual([
      "changelog-release",
      "changelog-button-v1-0-0",
      "changelog-button-v1-0-0-2",
      "changelog-button-v1-0-0-2-2",
      "changelog-button-v1-0-0-3",
    ])
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(html).toContain(`href="#${id}"`)
    }
    expect(html).toContain('<nav aria-label="Changelog contents">')
    expect(html).toContain("<details")
    expect(html).toContain("<summary")
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain("break-words")
  })

  it("keeps HTML and unsafe Markdown links inert while rendering inline API names", () => {
    const html = renderToStaticMarkup(
      <Changelog
        source={
          "## Safe\n### Example\n- <script>alert(1)</script> `onChange` [link](javascript:alert(1))\n  continued"
        }
      />
    )
    expect(html).not.toContain("<script")
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("font-mono")
    expect(html).toContain(">onChange</code>")
    expect(html).toContain("continued</li>")
  })
})
