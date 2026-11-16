import ts from "typescript"
import { ruleFor, THEME_TO_APPEARANCE } from "./rules.mjs"

const UI_MODULE =
  /(?:^@techsio\/ui-kit\/|(?:^|\/)src\/|^\.\.?\/)(?:.*\/)?(atoms|molecules|organisms|templates)\/[a-z0-9-]+$/

/** Local identifier → exported component name, for ui-kit imports only. */
function uiImports(sourceFile) {
  const names = new Map()
  for (const statement of sourceFile.statements) {
    if (
      !(
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        UI_MODULE.test(statement.moduleSpecifier.text)
      )
    ) {
      continue
    }
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.set(
          element.name.text,
          (element.propertyName ?? element.name).text
        )
      }
    }
  }
  return names
}

function componentName(tagName, imports) {
  const text = tagName.getText()
  const [root, ...rest] = text.split(".")
  const exported = imports.get(root)
  if (!exported) {
    return null
  }
  return [exported, ...rest].join(".")
}

function attrText(name, value) {
  if (value === true) {
    return name
  }
  return `${name}="${value}"`
}

/**
 * Map the string literals an expression can evaluate to: ternary branches,
 * `||` / `??` operands and the right side of `&&`. Literals in conditions or
 * comparisons (`kind === "light" ? …`) are never touched. Returns whether
 * every result was a literal, and which mapped values need a special rewrite
 * that cannot be expressed inside an expression (e.g. Badge "outline").
 */
const isWrapper = (node) =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isNonNullExpression(node)

const isLiteral = (node) =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)

/** The sub-expressions whose value the whole expression can take, or null. */
function resultBranches(node) {
  if (isWrapper(node)) {
    return [node.expression]
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse]
  }
  if (!ts.isBinaryExpression(node)) {
    return null
  }
  const op = node.operatorToken.kind
  if (
    op === ts.SyntaxKind.BarBarToken ||
    op === ts.SyntaxKind.QuestionQuestionToken
  ) {
    return [node.left, node.right]
  }
  return op === ts.SyntaxKind.AmpersandAmpersandToken ? [node.right] : null
}

function mapLiteral(literal, rule, edits, sourceFile, result) {
  if (rule.special?.[literal.text]) {
    result.special.push(literal.text)
    return
  }
  const next = rule.map(literal.text)
  if (typeof next === "string" && next !== literal.text) {
    edits.push({
      start: literal.getStart(sourceFile),
      end: literal.getEnd(),
      text: `"${next}"`,
    })
  }
}

function mapValues(node, rule, edits, sourceFile) {
  const result = { complete: true, special: [] }
  const visit = (child) => {
    if (isLiteral(child)) {
      mapLiteral(child, rule, edits, sourceFile, result)
      return
    }
    const branches = resultBranches(child)
    if (branches) {
      branches.forEach(visit)
    } else {
      result.complete = false
    }
  }
  visit(node)
  return result
}

function reviewNote(notes, where, prop, expression, sourceFile, outcome) {
  const code = expression.getText(sourceFile).replace(/\s+/g, " ")
  if (outcome.special.length > 0) {
    notes.push(
      `${where}: \`${prop}={${code}}\` can be ${outcome.special.map((v) => `"${v}"`).join(", ")}, which needs separate props — rewrite by hand`
    )
  } else if (!outcome.complete) {
    notes.push(
      `${where}: check \`${prop}={${code}}\` — the value is computed, so its possible values were not mapped`
    )
  }
}

function transformAttribute(attribute, rule, edits, notes, sourceFile, where) {
  const nameNode = attribute.name
  const init = attribute.initializer
  const start = attribute.getStart(sourceFile)
  const end = attribute.getEnd()
  if (init && ts.isStringLiteral(init)) {
    const special = rule.special?.[init.text]
    const text = special
      ? special.map(([name, value]) => attrText(name, value)).join(" ")
      : attrText(rule.to, rule.map(init.text))
    edits.push({ start, end, text })
    return
  }
  edits.push({
    start: nameNode.getStart(sourceFile),
    end: nameNode.getEnd(),
    text: rule.to,
  })
  if (init && ts.isJsxExpression(init) && init.expression) {
    const outcome = mapValues(init.expression, rule, edits, sourceFile)
    reviewNote(notes, where, rule.to, init.expression, sourceFile, outcome)
  }
}

function transformJsx(node, imports, edits, notes, sourceFile) {
  const component = componentName(node.tagName, imports)
  if (!component) {
    return
  }
  let rule = ruleFor(component)
  const attrs = node.attributes.properties
  // Any ui-kit part carrying `theme` forwards Button props.
  if (
    !rule &&
    attrs.some((a) => ts.isJsxAttribute(a) && a.name.getText() === "theme")
  ) {
    rule = ruleFor("Button")
  }
  if (!rule) {
    return
  }
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  const where = `${sourceFile.fileName}:${line + 1} <${component}>`
  for (const attribute of attrs) {
    if (!ts.isJsxAttribute(attribute)) {
      continue
    }
    const attrRule = rule[attribute.name.getText()]
    if (attrRule) {
      transformAttribute(attribute, attrRule, edits, notes, sourceFile, where)
    }
  }
}

const THEME_VALUES = new Set([...Object.keys(THEME_TO_APPEARANCE), "unstyled"])

/** Object literals such as DataTable toolbar actions or story args. */
const EMPHASIS_RULE = { map: (v) => (v === "default" ? "neutral" : v) }

function transformObject(node, edits, notes, sourceFile, emphasisFile) {
  for (const property of node.properties) {
    if (
      !(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name))
    ) {
      continue
    }
    const key = property.name.text
    const value = ts.isStringLiteral(property.initializer)
      ? property.initializer.text
      : null
    const replace = (text) =>
      edits.push({
        start: property.getStart(sourceFile),
        end: property.getEnd(),
        text,
      })
    if (key === "theme" && value && THEME_VALUES.has(value)) {
      replace(
        value === "unstyled"
          ? "unstyled: true"
          : `appearance: "${THEME_TO_APPEARANCE[value]}"`
      )
    } else if (key === "emphasis" && emphasisFile) {
      if (value !== null) {
        replace(`severity: "${EMPHASIS_RULE.map(value)}"`)
        continue
      }
      // Computed: rename the key, map its result literals, keep the logic.
      edits.push({
        start: property.name.getStart(sourceFile),
        end: property.name.getEnd(),
        text: "severity",
      })
      const outcome = mapValues(
        property.initializer,
        EMPHASIS_RULE,
        edits,
        sourceFile
      )
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        property.getStart(sourceFile)
      )
      reviewNote(
        notes,
        `${sourceFile.fileName}:${line + 1} TotalsSummary row`,
        "severity",
        property.initializer,
        sourceFile,
        outcome
      )
    }
  }
}

function scriptKind(fileName) {
  if (fileName.endsWith(".tsx")) {
    return ts.ScriptKind.TSX
  }
  if (fileName.endsWith(".jsx")) {
    return ts.ScriptKind.JSX
  }
  return ts.ScriptKind.TS
}

export function transformSource(fileName, text) {
  const kind = scriptKind(fileName)
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    kind
  )
  const imports = uiImports(sourceFile)
  if (imports.size === 0) {
    return { text, notes: [] }
  }
  const emphasisFile = imports.has("TotalsSummary")
  const edits = []
  const notes = []
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      transformJsx(node, imports, edits, notes, sourceFile)
    } else if (ts.isObjectLiteralExpression(node)) {
      transformObject(node, edits, notes, sourceFile, emphasisFile)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  if (edits.length === 0) {
    return { text, notes }
  }
  edits.sort((a, b) => b.start - a.start)
  let out = text
  let last = Number.POSITIVE_INFINITY
  for (const edit of edits) {
    if (edit.end > last) {
      continue // nested edit already covered by an outer one
    }
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
    last = edit.start
  }
  return { text: out, notes }
}
