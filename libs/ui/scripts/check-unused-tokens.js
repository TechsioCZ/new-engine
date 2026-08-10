#!/usr/bin/env node

/// <reference types="node" />

/**
 * Optimized script to check for unused CSS custom properties (tokens) in Tailwind v4.
 *
 * This version understands Tailwind v4 namespace patterns and checks for actual usage
 * in both CSS and JS/TS files with better accuracy and performance.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { argv, stdout } from "node:process"

const TOKEN_DIRS = ["src/tokens"]
const SEARCH_DIRS = ["src/atoms", "src/molecules", "stories"]
const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".ts", ".tsx"])

/**
 * @param {string} directory - Directory to scan.
 * @param {ReadonlySet<string>} extensions - Included extensions.
 * @returns {string[]} - Matching file paths.
 */
const findFiles = (directory, extensions) => {
  const files = []
  const entries = readdirSync(directory, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...findFiles(entryPath, extensions))
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(entryPath)
    }
  }
  return files
}

/** @param {string} directory - Token directory. */
const findTokenFiles = (directory) => findFiles(directory, new Set([".css"]))

/** @param {string} directory - Source directory. */
const findSourceFiles = (directory) => findFiles(directory, SOURCE_EXTENSIONS)

/** @type {Readonly<Record<string, readonly string[]>>} */
const NAMESPACE_TO_UTILITIES = {
  aspect: ["aspect"],
  border: ["border"],
  color: [
    "bg",
    "text",
    "border",
    "ring",
    "fill",
    "stroke",
    "from",
    "to",
    "via",
    "decoration",
    "accent",
    "caret",
    "divide",
    "outline",
    "shadow",
    "ring-offset",
  ],
  font: ["font"],
  "font-weight": ["font"],
  gap: ["gap"],
  height: ["h"],
  leading: ["leading"],
  "line-height": ["leading"],
  margin: ["m", "mx", "my", "mt", "mb", "ml", "mr"],
  opacity: ["opacity"],
  padding: ["p", "px", "py", "pt", "pb", "pl", "pr"],
  radius: ["rounded"],
  ring: ["ring"],
  shadow: ["shadow"],
  spacing: [
    "p",
    "px",
    "py",
    "pt",
    "pb",
    "pl",
    "pr",
    "m",
    "mx",
    "my",
    "mt",
    "mb",
    "ml",
    "mr",
    "gap",
    "space-x",
    "space-y",
    "w",
    "h",
    "max-w",
    "max-h",
    "min-w",
    "min-h",
    "size",
    "basis",
    "inset",
    "top",
    "right",
    "bottom",
    "left",
  ],
  text: ["text"],
  width: ["w"],
}

/**
 * @typedef {object} TokenInfo
 * @property {string} file - Value.
 * @property {boolean} inThemeBlock - Value.
 * @property {number} line - Value.
 */

/** @typedef {TokenInfo & {token: string}} UnusedToken */

/**
 * @typedef {object} UsedToken
 * @property {true} used - Value.
 * @property {string} location - Value.
 * @property {string} type - Value.
 * @property {string} [match] - Value.
 */

/** @typedef {UsedToken | {used: false}} UsageResult */

/** @type {Map<string, string>} */
const fileCache = new Map()
let debugMode = false

/** @param {string} filePath - Value. */
const readFileWithCache = (filePath) => {
  const cachedContent = fileCache.get(filePath)
  if (cachedContent !== undefined) {
    return cachedContent
  }

  const content = readFileSync(filePath, "utf-8")
  fileCache.set(filePath, content)
  return content
}

/** @param {string} token - Value. */
const getTokenNamespace = (token) => {
  const namespaceEnd = token.indexOf("-", 2)
  return namespaceEnd === -1 ? null : token.slice(2, namespaceEnd)
}

/** @param {string} token - Value. */
const getTokenNameWithoutNamespace = (token) => {
  const namespaceEnd = token.indexOf("-", 2)
  return namespaceEnd === -1
    ? token.replace(/^--/u, "")
    : token.slice(namespaceEnd + 1)
}

/** @param {string} token - Value. */
const generatePossibleUtilities = (token) => {
  const namespace = getTokenNamespace(token)
  const nameWithoutNamespace = getTokenNameWithoutNamespace(token)
  const prefixes =
    namespace === null ? undefined : NAMESPACE_TO_UTILITIES[namespace]

  if (prefixes === undefined) {
    return [nameWithoutNamespace]
  }

  const utilities = []
  for (const prefix of prefixes) {
    utilities.push(
      `${prefix}-${nameWithoutNamespace}`,
      `-${prefix}-${nameWithoutNamespace}`,
      `${prefix}-[var(${token})]`,
    )
  }
  utilities.push(`var(${token})`, token)

  return [...new Set(utilities)]
}

/**
 * @param {string} block - Value.
 * @param {string} filePath - Value.
 * @param {Map<string, TokenInfo>} tokens - Value.
 */
const extractTokensFromBlock = (block, filePath, tokens) => {
  for (const [index, line] of block.split("\n").entries()) {
    const match = /^\s*(?<token>--[\w-]+)\s*:/u.exec(line)
    const token = match?.groups?.token
    if (token !== undefined) {
      tokens.set(token, {
        file: filePath,
        inThemeBlock: block.includes("@theme"),
        line: index + 1,
      })
    }
  }
}

/** @param {string} filePath - Value. */
const extractTokensFromFile = (filePath) => {
  const content = readFileWithCache(filePath)
  /** @type {Map<string, TokenInfo>} */
  const tokens = new Map()
  const blockPatterns = [
    /@theme\s+(?:static|inline)\s*\{[^}]+\}/gsu,
    /:root\s*\{[^}]+\}/gsu,
  ]

  for (const pattern of blockPatterns) {
    for (const match of content.matchAll(pattern)) {
      extractTokensFromBlock(match[0], filePath, tokens)
    }
  }

  return tokens
}

/** @param {readonly string[]} utilities - Value. */
const createSearchPatterns = (utilities) =>
  utilities.flatMap((utility) => {
    const escaped = utility.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")
    return [
      new RegExp(`['"\`][^'"\`]*\\s${escaped}(?:\\s|['"\`])`, "u"),
      new RegExp(`['"\`]${escaped}\\s[^'"\`]*['"\`]`, "u"),
      new RegExp(`['"\`]${escaped}['"\`]`, "u"),
      new RegExp(`\\$\\{[^}]*\\}[^"'\`]*${escaped}`, "u"),
      new RegExp(`${escaped}[^"'\`]*\\$\\{[^}]*\\}`, "u"),
      new RegExp(`data-\\[[^\\]]+\\]:[^\\s"'\`]*${escaped}`, "u"),
      new RegExp(
        `(?:hover|focus|focus-visible|active|disabled|group-hover|peer-focus|peer-disabled|group-disabled|placeholder):[^\\s"'\`]*${escaped}`,
        "u",
      ),
      new RegExp(`(?:sm|md|lg|xl|2xl):[^\\s"'\`]*${escaped}`, "u"),
    ]
  })

/**
 * @param {string} content - Value.
 * @param {readonly string[]} possibleUtilities - Value.
 * @param {string} file - Value.
 */
const passesQuickCheck = (content, possibleUtilities, file) => {
  for (const utility of possibleUtilities) {
    if (content.includes(utility)) {
      if (debugMode) {
        console.log(`  Quick check found "${utility}" in ${file}`)
      }
      return true
    }
  }
  return false
}

/**
 * @param {string} content - Value.
 * @param {string} token - Value.
 */
const findSpecialSyntax = (content, token) => {
  for (const property of ["length", "width", "height", "size"]) {
    const syntax = `(${property}:${token})`
    if (content.includes(syntax)) {
      return syntax
    }
  }
  return null
}

/**
 * @param {string} content - Value.
 * @param {readonly RegExp[]} searchPatterns - Value.
 */
const findUtilityMatch = (content, searchPatterns) => {
  for (const [index, pattern] of searchPatterns.entries()) {
    const match = pattern.exec(content)
    if (match !== null) {
      if (debugMode) {
        console.log(`    Pattern ${index} matched: ${pattern}`)
        console.log(`    Match: "${match[0]}"`)
      }
      return match[0]
    }
  }
  return null
}

/**
 * @param {string} token - Value.
 * @param {TokenInfo} tokenInfo - Value.
 */
const findCssReference = (token, tokenInfo) => {
  const sameFileContent = readFileWithCache(tokenInfo.file)
  if (sameFileContent.split(token).length > 2) {
    return { location: tokenInfo.file, type: "helper-token", used: true }
  }

  const tokenFiles = findTokenFiles(TOKEN_DIRS[0])
  for (const file of tokenFiles) {
    if (file !== tokenInfo.file && readFileWithCache(file).includes(token)) {
      return { location: file, type: "css-reference", used: true }
    }
  }
  return null
}

/**
 * @param {string} file - Value.
 * @param {string} token - Value.
 * @param {readonly string[]} possibleUtilities - Value.
 * @param {readonly RegExp[]} searchPatterns - Value.
 * @returns {UsedToken | null} - Found reference.
 */
const findSourceReference = (
  file,
  token,
  possibleUtilities,
  searchPatterns,
) => {
  const content = readFileWithCache(file)
  const specialMatch = findSpecialSyntax(content, token)
  if (
    !passesQuickCheck(content, possibleUtilities, file) &&
    specialMatch === null
  ) {
    if (debugMode) {
      console.log(`  Skipping ${file} - no utilities found in quick check`)
    }
    return null
  }

  if (specialMatch !== null) {
    if (debugMode) {
      console.log(`    Special syntax matched: ${specialMatch}`)
    }
    return {
      location: file,
      match: specialMatch,
      type: "tailwind-v4-syntax",
      used: true,
    }
  }

  const utilityMatch = findUtilityMatch(content, searchPatterns)
  return utilityMatch === null
    ? null
    : { location: file, match: utilityMatch, type: "utility-class", used: true }
}

/**
 * @param {string} token - Value.
 * @param {Map<string, TokenInfo>} allTokens - Value.
 * @returns {UsageResult} - Value.
 */
const isTokenUsed = (token, allTokens) => {
  const tokenInfo = allTokens.get(token)
  if (tokenInfo === undefined) {
    return { used: false }
  }

  const cssReference = findCssReference(token, tokenInfo)
  if (cssReference !== null) {
    return cssReference
  }

  const possibleUtilities = generatePossibleUtilities(token)
  const searchPatterns = createSearchPatterns(possibleUtilities)
  for (const directory of SEARCH_DIRS) {
    const files = findSourceFiles(directory)
    for (const file of files) {
      const reference = findSourceReference(
        file,
        token,
        possibleUtilities,
        searchPatterns,
      )
      if (reference !== null) {
        return reference
      }
    }
  }

  return { used: false }
}

/**
 * @param {UnusedToken[]} unusedTokens - Value.
 * @param {Map<string, TokenInfo>} allTokens - Value.
 */
const generateReport = (unusedTokens, allTokens) => {
  const report = [
    "# Unused Tokens Report\n",
    `Generated on: ${new Date().toISOString()}\n`,
    `Total tokens analyzed: ${allTokens.size}`,
    `Unused tokens found: ${unusedTokens.length}\n`,
  ]

  /** @type {Map<string, UnusedToken[]>} */
  const byFile = new Map()
  for (const unusedToken of unusedTokens) {
    const tokens = byFile.get(unusedToken.file) ?? []
    tokens.push(unusedToken)
    byFile.set(unusedToken.file, tokens)
  }

  for (const [file, tokens] of byFile) {
    report.push(`\n## ${file}\n`)
    for (const { token, line } of tokens) {
      const namespace = getTokenNamespace(token)
      const possibleUtilities = generatePossibleUtilities(token)
        .slice(0, 5)
        .join(", ")
      report.push(
        `- Line ${line}: \`${token}\``,
        `  - Namespace: ${namespace ?? "none"}`,
        `  - Expected utilities: ${possibleUtilities}...`,
      )
    }
  }

  /** @type {Map<string, number>} */
  const namespaceStats = new Map()
  for (const { token } of unusedTokens) {
    const namespace = getTokenNamespace(token) ?? "other"
    namespaceStats.set(namespace, (namespaceStats.get(namespace) ?? 0) + 1)
  }

  report.push("\n## Statistics by Namespace\n")
  for (const [namespace, count] of namespaceStats) {
    const percentage = ((count / unusedTokens.length) * 100).toFixed(1)
    report.push(`- ${namespace}: ${count} tokens (${percentage}%)`)
  }

  return report.join("\n")
}

/**
 * @param {UsageResult} usage - Value.
 */
const logDebugResult = (usage) => {
  if (!usage.used) {
    console.log("❌ Token not found")
    return
  }

  console.log(`✅ Found in: ${usage.location}`)
  console.log(`   Type: ${usage.type}`)
  if (usage.match !== undefined) {
    console.log(`   Match: "${usage.match}"`)
  }
}

/**
 * @param {Map<string, TokenInfo>} allTokens - Value.
 * @param {string | undefined} debugToken - Value.
 */
const findUnusedTokens = (allTokens, debugToken) => {
  /** @type {UnusedToken[]} */
  const unusedTokens = []
  let checked = 0

  for (const [token, info] of allTokens) {
    if (debugToken !== undefined && token !== debugToken) {
      continue
    }

    checked += 1
    if (!debugMode && checked % 25 === 0) {
      stdout.write(`\rChecked ${checked}/${allTokens.size} tokens...`)
    }

    if (debugMode) {
      console.log(`\nChecking token: ${token}`)
      const utilities = generatePossibleUtilities(token)
      console.log(
        `Possible utilities: ${utilities.slice(0, 10).join(", ")}${utilities.length > 10 ? "..." : ""}`,
      )
    }

    const usage = isTokenUsed(token, allTokens)
    if (!usage.used) {
      unusedTokens.push({ token, ...info })
    }
    if (debugMode) {
      logDebugResult(usage)
    }
  }

  return unusedTokens
}

/**
 * @param {UnusedToken[]} unusedTokens - Value.
 * @param {Map<string, TokenInfo>} allTokens - Value.
 */
const displayResults = (unusedTokens, allTokens) => {
  console.log("\n")
  if (unusedTokens.length === 0) {
    console.log("✅ All tokens are being used!")
    return
  }

  console.log(`⚠️  Found ${unusedTokens.length} unused tokens`)
  const reportPath = "unused-tokens-report.md"
  writeFileSync(reportPath, generateReport(unusedTokens, allTokens))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)

  const unusedPercentage = (
    (unusedTokens.length / allTokens.size) *
    100
  ).toFixed(1)
  const usedCount = allTokens.size - unusedTokens.length
  const usedPercentage = ((usedCount / allTokens.size) * 100).toFixed(1)
  console.log("\n📊 Summary:")
  console.log(`   Total tokens: ${allTokens.size}`)
  console.log(`   Unused tokens: ${unusedTokens.length} (${unusedPercentage}%)`)
  console.log(`   Used tokens: ${usedCount} (${usedPercentage}%)`)
}

const main = () => {
  const args = argv.slice(2)
  debugMode = args.includes("--debug")
  const debugTokenArgument = args.find((argument) =>
    argument.startsWith("--token="),
  )
  const debugToken = debugTokenArgument?.split("=")[1]

  console.log("🔍 Checking for unused CSS tokens (Tailwind v4 optimized)...\n")
  const tokenFiles = findTokenFiles(TOKEN_DIRS[0])
  console.log(`Found ${tokenFiles.length} token files to analyze`)

  /** @type {Map<string, TokenInfo>} */
  const allTokens = new Map()
  for (const file of tokenFiles) {
    for (const [token, info] of extractTokensFromFile(file)) {
      allTokens.set(token, info)
    }
  }

  console.log(`Found ${allTokens.size} total tokens\n`)
  console.log("Checking usage (this may take a moment)...\n")
  displayResults(findUnusedTokens(allTokens, debugToken), allTokens)
  fileCache.clear()
}

try {
  main()
} catch (error) {
  console.error(error)
}
