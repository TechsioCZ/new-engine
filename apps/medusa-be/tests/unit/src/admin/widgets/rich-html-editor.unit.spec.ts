import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const richHtmlEditorPath = join(
  __dirname,
  "../../../../../src/admin/widgets/rich-html-editor.tsx"
)
const medusaConfigPath = join(__dirname, "../../../../../medusa-config.ts")
const CODE_MIRROR_PRISM_GUARD_PATTERN =
  /codeMirrorPlugin\(\s*\{[\s\S]*autoLoadLanguageSupport:\s*false/

const readRichHtmlEditorSource = () => readFileSync(richHtmlEditorPath, "utf8")
const readMedusaConfigSource = () => readFileSync(medusaConfigPath, "utf8")

describe("rich HTML editor admin runtime safety", () => {
  it("keeps the MDXEditor Prism runtime guards enabled", () => {
    const editorSource = readRichHtmlEditorSource()
    const medusaConfigSource = readMedusaConfigSource()

    expect(editorSource).toContain("codeBlockPlugin")
    expect(editorSource).toContain("codeMirrorPlugin")
    expect(editorSource).toMatch(CODE_MIRROR_PRISM_GUARD_PATTERN)
    expect(medusaConfigSource).toContain('Prism: "globalThis.Prism"')
  })
})
