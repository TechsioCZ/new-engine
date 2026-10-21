import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { type ComponentType, createElement as h, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"

const inputTag = /<input\b[^>]*>/
const nonfiniteText = /NaN|Infinity/
const componentImport = /^import .* from .*\n/gm
const rootStart = /^<(?:NumericInput|FormNumericInput)\b/m
const fencedSnippet = /```tsx\n([\s\S]*?)```/g
const jsxRoot = /<(?:NumericInput|FormNumericInput)\b/
const wrongExample = /Wrong[^\n]*:\s*$/

function positiveNumericExamples() {
  return ["numeric-input", "form-numeric-input"].flatMap((component) => {
    const path = new URL(
      `../skills/${component}-usage/SKILL.md`,
      import.meta.url
    )
    const text = readFileSync(path, "utf8")
    let previousEnd = 0
    return [...text.matchAll(fencedSnippet)].flatMap((match) => {
      const preceding = text.slice(previousEnd, match.index)
      previousEnd = (match.index ?? 0) + match[0].length
      const code = match[1] ?? ""
      if (wrongExample.test(preceding) || !jsxRoot.test(code)) {
        return []
      }
      return [{ component, code }]
    })
  })
}

function exampleBody(code: string) {
  const withoutImport = code.replace(componentImport, "")
  const start = withoutImport.search(rootStart)
  if (start < 0) {
    throw new Error("Expected a complete numeric JSX example")
  }
  return `${withoutImport.slice(0, start)}\nreturn (${withoutImport.slice(start)});`
}

describe("numeric field validation and nonfinite compatibility", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "never renders nonfinite numeric value %s as editable text",
    (value) => {
      for (const mode of ["value", "defaultValue"] as const) {
        const html = renderToStaticMarkup(
          h(
            NumericInput,
            { [mode]: value },
            h(
              NumericInput.Control,
              null,
              h(NumericInput.Input, { "aria-label": "Quantity" })
            )
          )
        )
        expect(html.match(inputTag)?.[0]).not.toMatch(nonfiniteText)
      }
    }
  )

  it.each(["default", "error", "warning", "success"] as const)(
    "forwards %s presentation without treating non-errors as invalid",
    (validateStatus) => {
      const html = renderToStaticMarkup(
        h(FormNumericInput, {
          label: "Order quantity",
          validateStatus,
          defaultValue: 2,
          // biome-ignore lint/correctness/noChildrenProp: React.createElement requires the component's mandatory children prop in this typed overload.
          children: h(NumericInput.Control, null, h(NumericInput.Input)),
        })
      )
      if (validateStatus === "default") {
        expect(html).not.toContain("data-validation=")
      } else {
        expect(html).toContain(`data-validation="${validateStatus}"`)
      }
      expect(html.match(inputTag)?.[0]?.includes('aria-invalid="true"')).toBe(
        validateStatus === "error"
      )
    }
  )

  it("gives explicit invalid precedence over success", () => {
    const html = renderToStaticMarkup(
      h(
        NumericInput,
        { invalid: true, validateStatus: "success" },
        h(NumericInput.Control, null, h(NumericInput.Input))
      )
    )
    expect(html).toContain('data-validation="error"')
    expect(html.match(inputTag)?.[0]).toContain('aria-invalid="true"')
  })
})

describe("copyable numeric usage examples", () => {
  it("renders a named editable input from every recommended compound example", () => {
    const examples = positiveNumericExamples()
    expect(examples.length).toBeGreaterThan(8)
    for (const { code, component } of examples) {
      const body = exampleBody(code)
      const compiled = ts.transpileModule(`function Example() { ${body} }`, {
        compilerOptions: {
          jsx: ts.JsxEmit.React,
          jsxFactory: "h",
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText
      // Only repository-authored, positive documentation snippets are evaluated.
      const Example = new Function(
        "NumericInput",
        "FormNumericInput",
        "useState",
        "h",
        `${compiled}; return Example`
      )(NumericInput, FormNumericInput, useState, h) as ComponentType
      const html = renderToStaticMarkup(h(Example))
      const input = html.match(inputTag)?.[0]
      expect(input, `${component}: ${code}`).toBeTruthy()
      expect(input).not.toContain("disabled=")
      expect(input?.includes("aria-label=") || html.includes("<label")).toBe(
        true
      )
    }
  })

  it("typechecks positive examples against current public component signatures", () => {
    const fixture = fileURLToPath(
      new URL("./__numeric-docs__.tsx", import.meta.url)
    )
    const content = `import {useState} from "react";\nimport {NumericInput} from "../src/atoms/numeric-input";\nimport {FormNumericInput} from "../src/molecules/form-numeric-input";\n${positiveNumericExamples()
      .map(
        ({ code }, index) =>
          `export function Example${index}() {${exampleBody(code)}}`
      )
      .join("\n")}`
    const options: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ["react", "react-dom", "node"],
    }
    const host = ts.createCompilerHost(options)
    const readSource = host.getSourceFile.bind(host)
    host.getSourceFile = (
      path,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    ) =>
      path === fixture
        ? ts.createSourceFile(
            path,
            content,
            ts.ScriptTarget.ES2022,
            true,
            ts.ScriptKind.TSX
          )
        : readSource(path, languageVersion, onError, shouldCreateNewSourceFile)
    const program = ts.createProgram([fixture], options, host)
    const source = program.getSourceFile(fixture)
    const diagnostics = ts.getPreEmitDiagnostics(program, source)
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
    ).toEqual([])
  }, 30_000)
})

describe("text field documentation contracts", () => {
  it("keeps template callback contracts in mobile-friendly prose rather than a wide table", () => {
    const text = readFileSync(
      new URL(
        "../stories/templates/numeric-input.stories.tsx",
        import.meta.url
      ),
      "utf8"
    )
    const callbacks =
      text.split("### Values and callbacks")[1]?.split("clampValueOnBlur")[0] ??
      ""
    expect(callbacks).not.toContain("| Callback |")
    for (const callback of ["onChange", "onValueChange", "onValueCommit"]) {
      expect(callbacks).toContain(["- \\`", callback, "\\` receives"].join(""))
    }
    expect(callbacks).toContain("details.valueAsNumber")
    expect(callbacks).toContain("clearing can emit NaN")
    expect(callbacks).toContain("application still validates and saves")
  })

  it.each([
    "atoms/input",
    "atoms/textarea",
    "molecules/form-input",
    "molecules/form-textarea",
  ])("%s disables ignored Controls on every fixed render", (component) => {
    const text = readFileSync(
      new URL(`../stories/${component}.stories.tsx`, import.meta.url),
      "utf8"
    )
    const stories = text.split("export const ").slice(1)
    for (const story of stories) {
      if (story.includes("render: () =>") || story.includes("render()")) {
        expect(story, component).toContain("controls: { disable: true }")
      }
    }
  })

  it("does not reject supported generated IDs or string drafts", () => {
    for (const [component, name] of [
      ["form-input", "FormInput"],
      ["form-textarea", "FormTextarea"],
      ["form-numeric-input", "FormNumericInput"],
    ]) {
      const text = readFileSync(
        new URL(`../skills/${component}-usage/SKILL.md`, import.meta.url),
        "utf8"
      )
      const validation =
        text.split("## Validation Commands")[1]?.split("##")[0] ?? ""
      expect(validation).not.toContain(
        "<{name}(?![^>]*id=)".replace("{name}", name ?? "")
      )
      expect(validation).not.toContain("<FormNumericInput[^>]*value=")
    }
  })
})
