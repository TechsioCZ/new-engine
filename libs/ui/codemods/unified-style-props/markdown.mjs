// Apply the unified-style-props transform to tsx/jsx code blocks in Markdown.
// Blocks rarely carry their imports, so every capitalised root tag gets a
// synthetic ui-kit import while transforming; the header is removed again.
import { transformSource } from "./transform.mjs"

const FENCE = /```(tsx|jsx|ts)\n([\s\S]*?)```/g
const ROOT_TAG = /<([A-Z][A-Za-z0-9]*)(?:\.[A-Z][A-Za-z0-9]*)?[\s/>]/g
const MARK = "/*__ui-kit-codemod__*/\n"

function header(code) {
  const roots = new Set()
  for (const match of code.matchAll(ROOT_TAG)) {
    roots.add(match[1])
  }
  return [...roots]
    .map((root) => `import { ${root} } from "@techsio/ui-kit/atoms/x"\n`)
    .join("")
}

export function transformMarkdown(fileName, text) {
  const notes = []
  const out = text.replace(FENCE, (_block, lang, code) => {
    const prefix = header(code)
    const { text: next, notes: blockNotes } = transformSource(
      `${fileName}.${lang === "ts" ? "ts" : "tsx"}`,
      `${prefix}${MARK}${code}`
    )
    notes.push(...blockNotes)
    const body = next.slice(next.indexOf(MARK) + MARK.length)
    return `\`\`\`${lang}\n${body}\`\`\``
  })
  return { text: out, notes }
}
