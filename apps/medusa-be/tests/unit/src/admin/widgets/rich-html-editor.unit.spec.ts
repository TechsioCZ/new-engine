import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const richHtmlEditorPath = join(
  __dirname,
  "../../../../../src/admin/widgets/rich-html-editor.tsx"
)
const CODE_MIRROR_PRISM_GUARD_PATTERN =
  /codeMirrorPlugin\(\s*\{[\s\S]*autoLoadLanguageSupport:\s*false/

const readRichHtmlEditorSource = () => readFileSync(richHtmlEditorPath, "utf8")

describe("rich HTML editor admin runtime safety", () => {
  it("uses CodeMirror for code blocks so MDXEditor does not require global Prism", () => {
    const source = readRichHtmlEditorSource()

    expect(source).toContain("codeBlockPlugin")
    expect(source).toContain("codeMirrorPlugin")
    expect(source).toMatch(CODE_MIRROR_PRISM_GUARD_PATTERN)
  })
})
