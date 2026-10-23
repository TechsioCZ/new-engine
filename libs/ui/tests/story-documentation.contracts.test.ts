import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const rawSpacing = /(?:space-y|gap)-(?:2|4|8)(?:\s|["`])/
const privateHelpers = /PlaygroundExample|<Questions|\.\.\/|storybook/
const root = fileURLToPath(new URL("../", import.meta.url))
function readStory(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(`${root}stories/${path}.stories.tsx`, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
}
function object(node: ts.Node): ts.ObjectLiteralExpression {
  if (ts.isObjectLiteralExpression(node)) {
    return node
  }
  if (ts.isSatisfiesExpression(node)) {
    return object(node.expression)
  }
  throw new Error(`Expected an object, received ${node.getText()}`)
}
function declaration(file: ts.SourceFile, name: string) {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }
    for (const item of statement.declarationList.declarations) {
      if (item.name.getText(file) === name && item.initializer) {
        return object(item.initializer)
      }
    }
  }
  throw new Error(`Missing ${name}`)
}
function property(
  node: ts.ObjectLiteralExpression,
  name: string
): ts.Expression {
  const entry = node.properties.find(
    (item) => item.name?.getText().replaceAll('"', "") === name
  )
  if (!(entry && ts.isPropertyAssignment(entry))) {
    throw new Error(`Missing property ${name}`)
  }
  return entry.initializer
}
function text(node: ts.Expression) {
  if (ts.isStringLiteralLike(node)) {
    return node.text
  }
  throw new Error("Documentation must be an authored literal")
}
function primarySource(path: string) {
  const story = declaration(readStory(path), "Playground")
  const docs = object(property(object(property(story, "parameters")), "docs"))
  const source = object(property(docs, "source"))
  if (text(property(source, "type")) !== "code") {
    throw new Error("Primary Docs source must stay copyable")
  }
  return text(property(source, "code"))
}

describe("shared Storybook documentation contracts", () => {
  it("disables ineffective controls on fixed Tabs galleries", () => {
    const file = readStory("templates/tabs")
    for (const name of ["Variants", "Sizes"]) {
      const parameters = object(property(declaration(file, name), "parameters"))
      const controls = object(property(parameters, "controls"))
      expect(property(controls, "disable").kind).toBe(ts.SyntaxKind.TrueKeyword)
    }
  })

  it("authors meaningful descriptions for every Popover appearance control", () => {
    const args = object(
      property(declaration(readStory("templates/popover"), "meta"), "argTypes")
    )
    for (const name of [
      "placement",
      "size",
      "border",
      "shadow",
      "showArrow",
      "showCloseButton",
    ]) {
      expect(
        text(property(object(property(args, name)), "description")).length
      ).toBeGreaterThan(60)
    }
  })

  it("keeps integration rows visible without callback or object editors", () => {
    const meta = declaration(readStory("templates/search-suggestions"), "meta")
    const parameters = object(property(meta, "parameters"))
    const controls = object(property(parameters, "controls"))
    const included = property(controls, "include")
    if (!ts.isArrayLiteralExpression(included)) {
      throw new Error("Controls need an explicit allowlist")
    }
    const visibleRows = included.elements.map((item) =>
      text(item as ts.Expression)
    )
    const docs = object(property(parameters, "docs"))
    const description = text(
      property(object(property(docs, "description")), "component")
    )
    expect(description).toContain("## Integration contract")
    const argTypes = object(property(meta, "argTypes"))
    for (const name of [
      "inputValue",
      "onInputValueChange",
      "filterBehavior",
      "groups",
      "resultSlot",
      "allResultsLink",
      "navigate",
    ]) {
      const row = object(property(argTypes, name))
      expect(visibleRows).toContain(name)
      expect(property(row, "control").kind).toBe(ts.SyntaxKind.FalseKeyword)
      expect(text(property(row, "description")).length).toBeGreaterThan(60)
      expect(description).toContain(name)
    }
    expect(description).toContain("globally unique")
    expect(description).toContain("noninteractive")
    expect(description).toContain("Highlighting never navigates")
  })

  it("uses the shared spacing scale for variant galleries", () => {
    const source = readFileSync(`${root}.storybook/decorator.tsx`, "utf8")
    for (const token of ["space-y-200", "gap-400", "space-y-800"]) {
      expect(source).toContain(token)
    }
    expect(source).not.toMatch(rawSpacing)
  })

  it("compiles primary Hotkeys and Accordion source using only public imports", () => {
    const snippets = new Map([
      [`${root}tests/__hotkeys-docs.tsx`, primarySource("atoms/hotkeys")],
      [
        `${root}tests/__accordion-docs.tsx`,
        primarySource("molecules/accordion"),
      ],
    ])
    for (const code of snippets.values()) {
      expect(code).not.toMatch(privateHelpers)
      expect(code).toContain("@techsio/ui-kit/")
    }
    const config = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
    const { options } = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      root
    )
    const compilerOptions = {
      ...options,
      incremental: false,
      paths: {
        ...options.paths,
        "@techsio/ui-kit/hotkeys": [`${root}src/hotkeys.ts`],
        "@techsio/ui-kit/atoms/*": [`${root}src/atoms/*`],
        "@techsio/ui-kit/molecules/*": [`${root}src/molecules/*`],
      },
    }
    const host = ts.createCompilerHost(compilerOptions)
    const originalGetSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (
      name,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    ) => {
      const source = snippets.get(name)
      return source === undefined
        ? originalGetSourceFile(
            name,
            languageVersion,
            onError,
            shouldCreateNewSourceFile
          )
        : ts.createSourceFile(
            name,
            source,
            languageVersion,
            true,
            ts.ScriptKind.TSX
          )
    }
    const program = ts.createProgram(
      [...snippets.keys()],
      compilerOptions,
      host
    )
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
    ).toEqual([])
  }, 60_000)
})
