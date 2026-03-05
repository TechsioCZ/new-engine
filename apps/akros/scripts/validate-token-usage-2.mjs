#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const DEFAULT_CONFIG_PATH = "scripts/token-usage.config.mjs"
const BASE_EXCLUDE_PATTERNS = ["**/node_modules/**", "**/.next/**", "**/.git/**"]
const CLASS_TOKEN_SPLIT_REGEX = /\s+/
const VARIANT_PREFIX_REGEX =
  /^(?:[a-z0-9@_-]+:|[a-z0-9@_-]+-\[[^\]]+\]:|data-\[[^\]]+\]:|aria-\[[^\]]+\]:|\[[^\]]+\]:|\*:|!)/i

function parseArgs(argv) {
  const args = { configPath: DEFAULT_CONFIG_PATH, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--config") {
      const nextValue = argv[index + 1]
      if (nextValue) {
        args.configPath = nextValue
        index += 1
      }
      continue
    }

    if (arg.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length)
      continue
    }
  }

  return args
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/")
}

function globToRegExp(globPattern) {
  const normalized = normalizePath(globPattern)
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")
  const escaped = withMarkers
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")
  return new RegExp(`^${escaped}$`)
}

function buildLineStarts(content) {
  const starts = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      starts.push(index + 1)
    }
  }
  return starts
}

function lineFromIndex(lineStarts, index) {
  let low = 0
  let high = lineStarts.length - 1
  let line = 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const value = lineStarts[mid]

    if (value <= index) {
      line = mid + 1
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return line
}

function sanitizeClassString(value) {
  return value
    .replaceAll(/\$\{[^}]*\}/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function tokenizeClassString(value) {
  return sanitizeClassString(value)
    .split(CLASS_TOKEN_SPLIT_REGEX)
    .map((token) => token.trim())
    .filter(Boolean)
}

function isPlausibleClassToken(token) {
  if (!(token && token.length > 1)) {
    return false
  }

  if (token.startsWith("//")) {
    return false
  }

  return /[a-z]/i.test(token)
}

const CLASS_ATTRIBUTE_NAMES = new Set(["classname", "class"])
const CLASS_UTILITY_CALLS = new Set(["cn", "clsx", "classnames", "twmerge"])

function unwrapExpression(expression) {
  let current = expression
  while (current) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression
      continue
    }
    if (ts.isAsExpression(current)) {
      current = current.expression
      continue
    }
    if (ts.isTypeAssertionExpression(current)) {
      current = current.expression
      continue
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression
      continue
    }
    break
  }
  return current
}

function isClassLikeVariableName(name) {
  const normalized = name.toLowerCase()
  if (normalized === "class") {
    return true
  }
  return (
    normalized.includes("classname") ||
    normalized.includes("classnames") ||
    normalized.includes("classes")
  )
}

function propertyNameText(propertyName, sourceFile) {
  if (ts.isIdentifier(propertyName)) {
    return propertyName.text.toLowerCase()
  }
  if (ts.isStringLiteral(propertyName) || ts.isNoSubstitutionTemplateLiteral(propertyName)) {
    return propertyName.text.toLowerCase()
  }
  return propertyName.getText(sourceFile).toLowerCase()
}

function isClassPropertyName(propertyName, sourceFile) {
  return CLASS_ATTRIBUTE_NAMES.has(propertyNameText(propertyName, sourceFile))
}

function classCallName(callExpression, sourceFile) {
  const callee = callExpression.expression
  if (ts.isIdentifier(callee)) {
    return callee.text.toLowerCase()
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return callee.name.text.toLowerCase()
  }
  return callee.getText(sourceFile).toLowerCase()
}

function isClassUtilityCall(callExpression, sourceFile) {
  return CLASS_UTILITY_CALLS.has(classCallName(callExpression, sourceFile))
}

function collectClassVariableInitializers(sourceFile) {
  const initializers = new Map()

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (isClassLikeVariableName(node.name.text)) {
        initializers.set(node.name.text, node.initializer)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return initializers
}

function extractClassEntries(content, relativePath) {
  const entries = []
  const seen = new Set()
  const lineStarts = buildLineStarts(content)
  const sourceFile = ts.createSourceFile(
    relativePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const classVariableInitializers = collectClassVariableInitializers(sourceFile)

  const addClassString = (classString, absoluteIndex) => {
    const line = lineFromIndex(lineStarts, absoluteIndex)
    for (const className of tokenizeClassString(classString)) {
      if (!isPlausibleClassToken(className)) {
        continue
      }

      const key = `${line}:${className}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      entries.push({ className, line })
    }
  }

  const visitedExpressions = new Set()
  const collectFromExpression = (expression, options = {}) => {
    const fromClassSink = Boolean(options.fromClassSink)
    const visitedIdentifiers = options.visitedIdentifiers ?? new Set()
    const rawNode = unwrapExpression(expression)
    if (!rawNode) {
      return
    }

    const key = `${rawNode.pos}:${rawNode.end}:${fromClassSink ? 1 : 0}`
    if (visitedExpressions.has(key)) {
      return
    }
    visitedExpressions.add(key)

    if (ts.isStringLiteral(rawNode) || ts.isNoSubstitutionTemplateLiteral(rawNode)) {
      if (fromClassSink) {
        addClassString(rawNode.text, rawNode.getStart(sourceFile))
      }
      return
    }

    if (ts.isTemplateExpression(rawNode)) {
      if (fromClassSink) {
        let templateValue = rawNode.head.text
        for (const span of rawNode.templateSpans) {
          templateValue += "${expr}"
          templateValue += span.literal.text
        }
        addClassString(templateValue, rawNode.getStart(sourceFile))
      }

      for (const span of rawNode.templateSpans) {
        collectFromExpression(span.expression, { fromClassSink, visitedIdentifiers })
      }
      return
    }

    if (ts.isConditionalExpression(rawNode)) {
      collectFromExpression(rawNode.whenTrue, { fromClassSink, visitedIdentifiers })
      collectFromExpression(rawNode.whenFalse, { fromClassSink, visitedIdentifiers })
      return
    }

    if (
      ts.isBinaryExpression(rawNode) &&
      (rawNode.operatorToken.kind === ts.SyntaxKind.PlusToken ||
        rawNode.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        rawNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        rawNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
    ) {
      collectFromExpression(rawNode.left, { fromClassSink, visitedIdentifiers })
      collectFromExpression(rawNode.right, { fromClassSink, visitedIdentifiers })
      return
    }

    if (ts.isArrayLiteralExpression(rawNode)) {
      for (const element of rawNode.elements) {
        collectFromExpression(element, { fromClassSink, visitedIdentifiers })
      }
      return
    }

    if (ts.isObjectLiteralExpression(rawNode)) {
      for (const property of rawNode.properties) {
        if (ts.isPropertyAssignment(property)) {
          const propertyIsClassLike = isClassPropertyName(property.name, sourceFile)
          collectFromExpression(property.initializer, {
            fromClassSink: fromClassSink || propertyIsClassLike,
            visitedIdentifiers,
          })
          continue
        }

        if (ts.isShorthandPropertyAssignment(property) && fromClassSink) {
          collectFromExpression(property.name, { fromClassSink, visitedIdentifiers })
          continue
        }

        if (ts.isSpreadAssignment(property)) {
          collectFromExpression(property.expression, { fromClassSink, visitedIdentifiers })
        }
      }
      return
    }

    if (ts.isCallExpression(rawNode)) {
      const nextFromClassSink = fromClassSink || isClassUtilityCall(rawNode, sourceFile)
      for (const argument of rawNode.arguments) {
        collectFromExpression(argument, {
          fromClassSink: nextFromClassSink,
          visitedIdentifiers,
        })
      }
      return
    }

    if (ts.isIdentifier(rawNode) && fromClassSink) {
      const identifierName = rawNode.text
      if (!isClassLikeVariableName(identifierName) || visitedIdentifiers.has(identifierName)) {
        return
      }

      const initializer = classVariableInitializers.get(identifierName)
      if (!initializer) {
        return
      }

      visitedIdentifiers.add(identifierName)
      collectFromExpression(initializer, { fromClassSink: true, visitedIdentifiers })
      visitedIdentifiers.delete(identifierName)
      return
    }

    if (ts.isElementAccessExpression(rawNode) || ts.isPropertyAccessExpression(rawNode)) {
      collectFromExpression(rawNode.expression, { fromClassSink, visitedIdentifiers })
      return
    }

    if (ts.isJsxExpression(rawNode)) {
      collectFromExpression(rawNode.expression, { fromClassSink, visitedIdentifiers })
      return
    }
  }

  const visit = (node) => {
    if (ts.isJsxAttribute(node)) {
      const attributeName = node.name.getText(sourceFile).toLowerCase()
      if (CLASS_ATTRIBUTE_NAMES.has(attributeName) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          addClassString(node.initializer.text, node.initializer.getStart(sourceFile))
        } else if (ts.isJsxExpression(node.initializer)) {
          collectFromExpression(node.initializer.expression, { fromClassSink: true })
        }
      }
    }

    if (ts.isPropertyAssignment(node) && isClassPropertyName(node.name, sourceFile)) {
      collectFromExpression(node.initializer, { fromClassSink: true })
    }

    if (ts.isCallExpression(node) && isClassUtilityCall(node, sourceFile)) {
      for (const argument of node.arguments) {
        collectFromExpression(argument, { fromClassSink: true })
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (isClassLikeVariableName(node.name.text)) {
        collectFromExpression(node.initializer, { fromClassSink: true })
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      isClassLikeVariableName(node.left.text)
    ) {
      collectFromExpression(node.right, { fromClassSink: true })
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return entries
}

function stripVariants(className) {
  let base = className.trim()
  while (VARIANT_PREFIX_REGEX.test(base)) {
    base = base.replace(VARIANT_PREFIX_REGEX, "")
  }
  return base
}

function resolvePrefixValue(baseClass, prefixes) {
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass
  const sortedPrefixes = prefixes.slice().sort((left, right) => right.length - left.length)

  for (const prefix of sortedPrefixes) {
    const prefixWithDash = `${prefix}-`
    if (!normalized.startsWith(prefixWithDash)) {
      continue
    }

    return {
      prefix,
      value: normalized.slice(prefixWithDash.length),
      normalized,
    }
  }

  return null
}

function checkNoArbitraryValues(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const allowPatterns = ruleConfig.allowClassPatterns ?? []
  if (allowPatterns.some((pattern) => pattern.test(className) || pattern.test(baseClass))) {
    return null
  }

  const hasArbitrarySyntax =
    baseClass.includes("[") ||
    baseClass.includes("]") ||
    /\(--[\w-]+\)/.test(baseClass) ||
    /var\(--[\w-]+\)/.test(baseClass)

  if (!hasArbitrarySyntax) {
    return null
  }

  return {
    rule: "no-arbitrary-values",
    message: "Nepoužívej arbitrary utility hodnoty, použij token utility z libs/ui.",
  }
}

function checkNoTailwindPalette(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className).replace(/\/\d+$/, "")
  const match = resolvePrefixValue(baseClass, ruleConfig.colorUtilityPrefixes ?? [])
  if (!match) {
    return null
  }

  const palette = ruleConfig.paletteNames ?? []
  const value = match.value
  const isPalette = palette.some((colorName) => value === colorName || value.startsWith(`${colorName}-`))
  if (!isPalette) {
    return null
  }

  return {
    rule: "no-tailwind-palette",
    message: `Nepoužívej Tailwind palette (${value}), použij semantic token (např. text-fg-primary).`,
  }
}

function checkNoTailwindSpacingScale(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const match = resolvePrefixValue(baseClass, ruleConfig.prefixes ?? [])
  if (!match) {
    return null
  }

  const value = match.value
  if (!value || value.includes("/")) {
    return null
  }
  if (value.startsWith("[") || value.startsWith("(")) {
    return null
  }

  const allowedKeywords = new Set(ruleConfig.allowedKeywords ?? [])
  if (allowedKeywords.has(value)) {
    return null
  }

  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    return null
  }

  const allowedNumericValues = new Set(ruleConfig.allowedNumericValues ?? [])
  if (allowedNumericValues.has(value)) {
    return null
  }

  return {
    rule: "no-tailwind-spacing-scale",
    message: `Nepoužívej Tailwind spacing scale (${match.prefix}-${value}), použij token scale.`,
  }
}

function checkNoTailwindContainerScale(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const match = resolvePrefixValue(baseClass, ruleConfig.prefixes ?? [])
  if (!match) {
    return null
  }

  const value = match.value
  if (!value || value.startsWith("[") || value.startsWith("(") || value.includes("/")) {
    return null
  }

  const disallowedValues = new Set(ruleConfig.disallowedValues ?? [])
  if (!disallowedValues.has(value)) {
    return null
  }

  return {
    rule: "no-tailwind-container-scale",
    message: `Nepoužívej default container scale (${match.prefix}-${value}), použij container token (např. max-w-max-w).`,
  }
}

function validateClass(className, rulesConfig) {
  const checks = [
    [checkNoArbitraryValues, rulesConfig.noArbitraryValues],
    [checkNoTailwindPalette, rulesConfig.noTailwindPalette],
    [checkNoTailwindSpacingScale, rulesConfig.noTailwindSpacingScale],
    [checkNoTailwindContainerScale, rulesConfig.noTailwindContainerScale],
  ]

  for (const [check, ruleConfig] of checks) {
    const finding = check(className, ruleConfig)
    if (finding) {
      return finding
    }
  }

  return null
}

function resolveRuleConfigMap(config) {
  const rules = config.rules ?? {}
  return {
    noArbitraryValues: rules.noArbitraryValues ?? { enabled: false },
    noTailwindPalette: rules.noTailwindPalette ?? { enabled: false },
    noTailwindSpacingScale: rules.noTailwindSpacingScale ?? { enabled: false },
    noTailwindContainerScale: rules.noTailwindContainerScale ?? { enabled: false },
  }
}

function listSourceFiles(rootDir, config) {
  const extensions = new Set(config.fileExtensions ?? [".ts", ".tsx"])
  const excludeRegexes = [...BASE_EXCLUDE_PATTERNS, ...(config.exclude ?? [])].map(globToRegExp)
  const scanDirectories = config.scanDirectories ?? []

  const files = []

  const walk = (absoluteDir) => {
    if (!fs.existsSync(absoluteDir)) {
      return
    }

    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name)
      const relativePath = normalizePath(path.relative(rootDir, absolutePath))

      if (excludeRegexes.some((regex) => regex.test(relativePath))) {
        continue
      }

      if (entry.isDirectory()) {
        walk(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name)
      if (!extensions.has(extension)) {
        continue
      }

      files.push(relativePath)
    }
  }

  for (const relativeDir of scanDirectories) {
    walk(path.resolve(rootDir, relativeDir))
  }

  return files.sort((left, right) => left.localeCompare(right))
}

function printSummary(findings, scannedFileCount) {
  const byRule = new Map()
  for (const finding of findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
  }

  console.log(`Scanned files: ${scannedFileCount}`)
  if (findings.length === 0) {
    console.log("No guardrail violations found.")
    return
  }

  console.log(`Total violations: ${findings.length}`)
  for (const [rule, count] of [...byRule.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    console.log(`- ${rule}: ${count}`)
  }

  const groupedByFile = new Map()
  for (const finding of findings) {
    if (!groupedByFile.has(finding.file)) {
      groupedByFile.set(finding.file, [])
    }
    groupedByFile.get(finding.file).push(finding)
  }

  for (const [file, fileFindings] of [...groupedByFile.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    console.log(`\n${file}`)
    for (const finding of fileFindings) {
      console.log(`  L${finding.line} ${finding.className}`)
      console.log(`    ${finding.message}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rootDir = process.cwd()
  const configPath = path.resolve(rootDir, args.configPath)

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`)
    process.exit(2)
  }

  const configModule = await import(pathToFileURL(configPath).href)
  const config = configModule.default ?? configModule
  const rulesConfig = resolveRuleConfigMap(config)
  const sourceFiles = listSourceFiles(rootDir, config)

  const findings = []

  for (const file of sourceFiles) {
    const absoluteFilePath = path.resolve(rootDir, file)
    const content = fs.readFileSync(absoluteFilePath, "utf8")
    const classEntries = extractClassEntries(content, file)

    for (const entry of classEntries) {
      const ruleFinding = validateClass(entry.className, rulesConfig)
      if (!ruleFinding) {
        continue
      }

      findings.push({
        file,
        line: entry.line,
        className: entry.className,
        rule: ruleFinding.rule,
        message: ruleFinding.message,
      })
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          scannedFiles: sourceFiles.length,
          violationCount: findings.length,
          findings,
        },
        null,
        2,
      ),
    )
  } else {
    printSummary(findings, sourceFiles.length)
  }

  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("Token usage validation failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
