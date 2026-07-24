#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { parseSync } from "oxc-parser"

import {
  globToRegExp,
  normalizePath,
  parseGuardrailArgs,
} from "./guardrail-utils.mjs"
import defaultConfig from "./ui-primitives.config.mjs"

const DEFAULT_CONFIG_PATH = "scripts/ui-primitives.config.mjs"
const BASE_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.git/**",
]

function listSourceFiles(rootDir, config) {
  const extensions = new Set(config.fileExtensions ?? [".ts", ".tsx"])
  const excludeRegexes = [
    ...BASE_EXCLUDE_PATTERNS,
    ...(config.exclude ?? []),
  ].map(globToRegExp)
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

      if (!(entry.isFile() && extensions.has(path.extname(entry.name)))) {
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

function parseRuleConfig(config) {
  const rules = config.rules ?? {}
  const bannedJsxTags = rules.bannedJsxTags ?? { enabled: false }
  const bannedImports = rules.bannedImports ?? { enabled: false }

  const allowByFile = (bannedJsxTags.allowByFile ?? []).map((item) => ({
    tag: String(item.tag ?? "").toLowerCase(),
    fileRegex: globToRegExp(String(item.filePattern ?? "")),
  }))

  return {
    bannedJsxTags: {
      enabled: Boolean(bannedJsxTags.enabled),
      tags: new Set(
        (bannedJsxTags.tags ?? []).map((tag) => String(tag).toLowerCase())
      ),
      suggestions: bannedJsxTags.suggestions ?? {},
      allowByFile,
    },
    bannedImports: {
      enabled: Boolean(bannedImports.enabled),
      modulePatterns: (bannedImports.modulePatterns ?? []).map((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern
        }
        return new RegExp(String(pattern))
      }),
      message:
        bannedImports.message ??
        "Nepovoleny import knihovny. Pouzij komponentu z @techsio/ui-kit.",
    },
  }
}

function getLineAndColumn(content, position) {
  const precedingContent = content.slice(0, position)
  const line = precedingContent.split("\n").length
  const lastNewline = precedingContent.lastIndexOf("\n")
  return { line, column: position - lastNewline }
}

function isIntrinsicTagName(tagNameNode) {
  if (tagNameNode.type === "JSXIdentifier") {
    const text = tagNameNode.name
    return text.length > 0 && text[0] === text[0].toLowerCase()
  }

  return tagNameNode.type === "JSXNamespacedName"
}

function normalizedTagName(tagNameNode) {
  if (tagNameNode.type === "JSXIdentifier") {
    return tagNameNode.name.toLowerCase()
  }

  if (tagNameNode.type === "JSXNamespacedName") {
    return `${tagNameNode.namespace.name}:${tagNameNode.name.name}`.toLowerCase()
  }

  return ""
}

function isTagAllowedForFile(relativeFilePath, tagName, allowByFile) {
  return allowByFile.some(
    (item) =>
      item.tag === tagName &&
      item.fileRegex.test(normalizePath(relativeFilePath))
  )
}

function resolveBannedImportFinding(node, content, rulesConfig) {
  if (
    !(
      rulesConfig.bannedImports.enabled &&
      node.type === "ImportDeclaration" &&
      typeof node.source?.value === "string"
    )
  ) {
    return null
  }

  const moduleName = node.source.value
  const isBannedModule = rulesConfig.bannedImports.modulePatterns.some(
    (pattern) => pattern.test(moduleName)
  )

  if (!isBannedModule) {
    return null
  }

  const { line, column } = getLineAndColumn(content, node.source.start)

  return {
    rule: "no-banned-ui-imports",
    line,
    column,
    detail: moduleName,
    message: rulesConfig.bannedImports.message,
  }
}

function resolveBannedJsxTagFinding(
  node,
  content,
  relativeFilePath,
  rulesConfig
) {
  if (
    !(rulesConfig.bannedJsxTags.enabled && node.type === "JSXOpeningElement")
  ) {
    return null
  }

  const tagNode = node.name
  if (!isIntrinsicTagName(tagNode)) {
    return null
  }

  const tagName = normalizedTagName(tagNode)
  const isBannedTag = rulesConfig.bannedJsxTags.tags.has(tagName)
  const isAllowed = isTagAllowedForFile(
    relativeFilePath,
    tagName,
    rulesConfig.bannedJsxTags.allowByFile
  )

  if (!(isBannedTag && !isAllowed)) {
    return null
  }

  const { line, column } = getLineAndColumn(content, tagNode.start)
  const suggestion = rulesConfig.bannedJsxTags.suggestions[tagName]
  const message = suggestion
    ? `Nepouzivej nativni <${tagName}>. ${suggestion}`
    : `Nepouzivej nativni <${tagName}>. Pouzij komponentu z libs/ui.`

  return {
    rule: "no-native-jsx-primitives",
    line,
    column,
    detail: `<${tagName}>`,
    message,
  }
}

function collectFileFindings(relativeFilePath, content, rulesConfig) {
  const parseResult = parseSync(relativeFilePath, content, {
    lang: relativeFilePath.endsWith(".tsx") ? "tsx" : "ts",
    sourceType: "module",
  })
  const findings = []
  const dedupe = new Set()

  const pushFinding = (finding) => {
    const key = `${finding.rule}:${finding.line}:${finding.column}:${finding.detail}`
    if (dedupe.has(key)) {
      return
    }
    dedupe.add(key)
    findings.push(finding)
  }

  const visit = (node) => {
    const importFinding = resolveBannedImportFinding(node, content, rulesConfig)
    if (importFinding) {
      pushFinding(importFinding)
    }

    const jsxTagFinding = resolveBannedJsxTagFinding(
      node,
      content,
      relativeFilePath,
      rulesConfig
    )
    if (jsxTagFinding) {
      pushFinding(jsxTagFinding)
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === "object" && "type" in child) {
            visit(child)
          }
        }
      } else if (value && typeof value === "object" && "type" in value) {
        visit(value)
      }
    }
  }

  visit(parseResult.program)
  return findings
}

function printSummary(findings, scannedFileCount) {
  const byRule = new Map()
  for (const finding of findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
  }

  console.log(`Scanned files: ${scannedFileCount}`)
  if (findings.length === 0) {
    console.log("No UI primitives violations found.")
    return
  }

  console.log(`Total violations: ${findings.length}`)
  for (const [rule, count] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`- ${rule}: ${count}`)
  }

  const groupedByFile = new Map()
  for (const finding of findings) {
    if (!groupedByFile.has(finding.file)) {
      groupedByFile.set(finding.file, [])
    }
    groupedByFile.get(finding.file).push(finding)
  }

  for (const [file, fileFindings] of [...groupedByFile.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`\n${file}`)
    for (const finding of fileFindings) {
      console.log(`  L${finding.line}:${finding.column} ${finding.detail}`)
      console.log(`    ${finding.message}`)
    }
  }
}

async function main() {
  const args = parseGuardrailArgs(process.argv.slice(2), DEFAULT_CONFIG_PATH)
  const rootDir = process.cwd()
  const configPath = path.resolve(rootDir, args.configPath)

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`)
    process.exit(2)
  }

  let config = defaultConfig
  if (args.configPath !== DEFAULT_CONFIG_PATH) {
    const configModule = await import(pathToFileURL(configPath).href)
    config = configModule.default ?? configModule
  }
  const rulesConfig = parseRuleConfig(config)
  const sourceFiles = listSourceFiles(rootDir, config)

  const findings = []

  for (const relativeFilePath of sourceFiles) {
    const absoluteFilePath = path.resolve(rootDir, relativeFilePath)
    const content = fs.readFileSync(absoluteFilePath, "utf8")
    const fileFindings = collectFileFindings(
      relativeFilePath,
      content,
      rulesConfig
    )

    for (const finding of fileFindings) {
      findings.push({
        file: relativeFilePath,
        ...finding,
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
        2
      )
    )
  } else {
    printSummary(findings, sourceFiles.length)
  }

  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("UI primitives validation failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
