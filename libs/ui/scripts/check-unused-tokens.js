#!/usr/bin/env node

/**
 * Optimized script to check for unused CSS custom properties (tokens) in Tailwind v4
 *
 * This version understands Tailwind v4 namespace patterns and checks for actual usage
 * in both CSS and JS/TS files with better accuracy and performance.
 */

import fs, { globSync } from "node:fs"
import path from "node:path"
import {
  COLOR_PREFIXES,
  INSET_PREFIXES,
  MARGIN_PREFIXES,
  PADDING_PREFIXES,
  SINGLE_PREFIX_NAMESPACES,
  SIZING_PREFIXES,
  SPACE_PREFIXES,
  without,
} from "./token-utility-prefixes.js"

// Configuration
const TOKEN_DIRS = ["src/tokens"]
const SEARCH_DIRS = ["src/atoms", "src/molecules", "stories"]
const TOKEN_FILE_PATTERN = "**/*.css"
const SOURCE_FILE_PATTERN = "**/*.{ts,tsx,js,jsx,css}"

// This checker predates logical (ps/pe/ms/me) and axis inset utilities but
// also accepts gradient stops, divide colors and flex-basis.
const NO_LOGICAL = ["ps", "pe", "ms", "me"]
const PADDING = without(PADDING_PREFIXES, NO_LOGICAL)
const MARGIN = without(MARGIN_PREFIXES, NO_LOGICAL)

// Tailwind v4 namespace to utility class prefixes mapping
const NAMESPACE_TO_UTILITIES = {
  ...SINGLE_PREFIX_NAMESPACES,
  color: [...COLOR_PREFIXES, "from", "to", "via", "divide"],
  spacing: [
    ...PADDING,
    ...MARGIN,
    "gap",
    ...SPACE_PREFIXES,
    ...SIZING_PREFIXES,
    "size",
    "basis",
    ...without(INSET_PREFIXES, ["inset-x", "inset-y"]),
  ],
  width: ["w"],
  height: ["h"],
  gap: ["gap"],
  padding: PADDING,
  margin: MARGIN,
  "line-height": ["leading"],
  ring: ["ring"],
  aspect: ["aspect"],
  leading: ["leading"],
}

const THEME_BLOCK_REGEX = /@theme\s+(?:static|inline)\s*{([^}]+)}/gs
const ROOT_BLOCK_REGEX = /:root\s*{([^}]+)}/gs
const TOKEN_LINE_REGEX = /^\s*(--[\w-]+)\s*:/
const NAMESPACE_REGEX = /^--([^-]+)-/
const NAME_WITHOUT_NAMESPACE_REGEX = /^--[^-]+-(.+)$/
const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g
// Kept instead of RegExp.escape so --debug prints readable patterns.
const escapeRegExp = (text) => text.replace(REGEXP_SPECIAL_CHARS, "\\$&")
// Tailwind v4 arbitrary-property forms such as border-(length:--token)
const SPECIAL_SYNTAX_KINDS = ["length", "width", "height", "size"]

// Global debug mode flag
let debugMode = false

// Cache for file contents and glob results to avoid re-reading
const fileCache = new Map()
const globCache = new Map()

/**
 * Read file with caching
 */
function readFileWithCache(filePath) {
  if (!fileCache.has(filePath)) {
    fileCache.set(filePath, fs.readFileSync(filePath, "utf-8"))
  }
  return fileCache.get(filePath)
}

function globWithCache(pattern) {
  if (!globCache.has(pattern)) {
    globCache.set(pattern, globSync(pattern))
  }
  return globCache.get(pattern)
}

const getTokenFiles = () =>
  globWithCache(path.join(TOKEN_DIRS[0], TOKEN_FILE_PATTERN))

/**
 * Extract namespace from token name
 * --color-btn-primary -> 'color'
 * --spacing-button-sm -> 'spacing'
 */
function getTokenNamespace(token) {
  const match = token.match(NAMESPACE_REGEX)
  return match ? match[1] : null
}

/**
 * Get the token name without namespace prefix
 * --color-btn-primary -> btn-primary
 * --spacing-button-sm -> button-sm
 */
function getTokenNameWithoutNamespace(token) {
  const match = token.match(NAME_WITHOUT_NAMESPACE_REGEX)
  return match ? match[1] : token.slice(2)
}

/**
 * Generate all possible utility classes for a token
 */
function generatePossibleUtilities(token) {
  const namespace = getTokenNamespace(token)
  const nameWithoutNamespace = getTokenNameWithoutNamespace(token)
  const prefixes = namespace && NAMESPACE_TO_UTILITIES[namespace]

  if (!prefixes) {
    // If no namespace match, return the token name for direct usage checks
    return [nameWithoutNamespace]
  }

  const utilities = prefixes.flatMap((prefix) => [
    // Direct mapping
    `${prefix}-${nameWithoutNamespace}`,
    // Handle negative utilities (like -m-4)
    `-${prefix}-${nameWithoutNamespace}`,
    // Handle arbitrary value syntax (though less common with custom properties)
    `${prefix}-[var(${token})]`,
  ])

  // Also check for direct CSS variable usage
  utilities.push(`var(${token})`, token)

  return [...new Set(utilities)]
}

/**
 * Extract all tokens from a CSS file
 */
function extractTokensFromFile(filePath) {
  const content = readFileWithCache(filePath)
  const tokens = new Map()

  // Match tokens inside @theme blocks, then regular :root blocks (legacy tokens)
  const blocks = [
    ...content.matchAll(THEME_BLOCK_REGEX),
    ...content.matchAll(ROOT_BLOCK_REGEX),
  ].map((match) => match[0])

  for (const block of blocks) {
    for (const [index, line] of block.split("\n").entries()) {
      const match = line.match(TOKEN_LINE_REGEX)
      if (match) {
        tokens.set(match[1], {
          file: filePath,
          line: index + 1,
          inThemeBlock: block.includes("@theme"),
        })
      }
    }
  }

  return tokens
}

/**
 * Create efficient search patterns for a token
 */
function createSearchPatterns(utilities) {
  return utilities.flatMap((utility) => {
    const escaped = escapeRegExp(utility)

    // Create patterns that match utility usage in various contexts
    return [
      // In strings with spaces (most common in tailwind-variants)
      new RegExp(`['"\`][^'"\`]*\\s${escaped}(?:\\s|['"\`])`),
      new RegExp(`['"\`]${escaped}\\s[^'"\`]*['"\`]`),
      // At the beginning or end of a string
      new RegExp(`['"\`]${escaped}['"\`]`),
      // In template literals with variables
      new RegExp(`\\$\\{[^}]*\\}[^"'\`]*${escaped}`),
      new RegExp(`${escaped}[^"'\`]*\\$\\{[^}]*\\}`),
      // Data attribute selectors
      new RegExp(`data-\\[[^\\]]+\\]:[^\\s"'\`]*${escaped}`),
      // Modifier prefixes (hover:, focus:, etc.)
      new RegExp(
        `(?:hover|focus|focus-visible|active|disabled|group-hover|peer-focus|peer-disabled|group-disabled|placeholder):[^\\s"'\`]*${escaped}`
      ),
      // Responsive prefixes
      new RegExp(`(?:sm|md|lg|xl|2xl):[^\\s"'\`]*${escaped}`),
    ]
  })
}

/**
 * Check token usage in token CSS files (helper tokens and var() references)
 */
function findCssUsage(token, tokenInfo) {
  // Count how many times the token appears in its own file
  const sameFileContent = readFileWithCache(tokenInfo.file)
  const matches = sameFileContent.match(new RegExp(escapeRegExp(token), "g"))
  // If it appears more than once (definition + usage), it's a helper token
  if (matches && matches.length > 1) {
    return { used: true, location: tokenInfo.file, type: "helper-token" }
  }

  // Check for direct token usage in calc(), var(), or other CSS functions
  const file = getTokenFiles().find(
    (candidate) =>
      candidate !== tokenInfo.file &&
      readFileWithCache(candidate).includes(token)
  )
  return file ? { used: true, location: file, type: "css-reference" } : null
}

/**
 * Check token usage in one source file
 */
function findSourceUsage(token, file, possibleUtilities, searchPatterns) {
  const content = readFileWithCache(file)

  // Quick check: if none of the possible utilities appear in the file, skip it
  const quickHit = possibleUtilities.find((util) => content.includes(util))
  if (debugMode && quickHit && !quickHit.includes("var(")) {
    console.log(`  Quick check found "${quickHit}" in ${file}`)
  }

  const specialMatch = SPECIAL_SYNTAX_KINDS.map(
    (kind) => `(${kind}:${token})`
  ).find((syntax) => content.includes(syntax))

  if (!(quickHit || specialMatch)) {
    if (debugMode) {
      console.log(`  Skipping ${file} - no utilities found in quick check`)
    }
    return null
  }

  // Check for special Tailwind v4 syntax first
  if (specialMatch) {
    if (debugMode) {
      console.log(`    Special syntax matched: ${specialMatch}`)
    }
    return {
      used: true,
      location: file,
      type: "tailwind-v4-syntax",
      match: specialMatch,
    }
  }

  // Detailed pattern matching
  for (const [i, pattern] of searchPatterns.entries()) {
    const match = content.match(pattern)
    if (match) {
      if (debugMode) {
        console.log(`    Pattern ${i} matched: ${pattern}`)
        console.log(`    Match: "${match[0]}"`)
      }
      return {
        used: true,
        location: file,
        type: "utility-class",
        match: match[0],
      }
    }
  }
  return null
}

/**
 * Check if a token is used in the codebase
 */
function isTokenUsed(token, allTokens) {
  const cssUsage = findCssUsage(token, allTokens.get(token))
  if (cssUsage) {
    return cssUsage
  }

  const possibleUtilities = generatePossibleUtilities(token)
  const searchPatterns = createSearchPatterns(possibleUtilities)
  for (const dir of SEARCH_DIRS) {
    for (const file of globWithCache(path.join(dir, SOURCE_FILE_PATTERN))) {
      const usage = findSourceUsage(
        token,
        file,
        possibleUtilities,
        searchPatterns
      )
      if (usage) {
        return usage
      }
    }
  }

  return { used: false }
}

/**
 * Generate detailed report
 */
function generateReport(unusedTokens, allTokens) {
  const report = [
    "# Unused Tokens Report\n",
    `Generated on: ${new Date().toISOString()}\n`,
    `Total tokens analyzed: ${allTokens.size}`,
    `Unused tokens found: ${unusedTokens.length}\n`,
  ]

  // Generate file sections
  const byFile = Map.groupBy(unusedTokens, ({ file }) => file)
  for (const [file, tokens] of byFile) {
    report.push(`\n## ${file}\n`)
    for (const { token, line } of tokens) {
      const namespace = getTokenNamespace(token)
      const possibleUtils = generatePossibleUtilities(token)
        .slice(0, 5)
        .join(", ")
      report.push(`- Line ${line}: \`${token}\``)
      report.push(`  - Namespace: ${namespace || "none"}`)
      report.push(`  - Expected utilities: ${possibleUtils}...`)
    }
  }

  // Summary statistics
  const byNamespace = Map.groupBy(
    unusedTokens,
    ({ token }) => getTokenNamespace(token) || "other"
  )
  report.push("\n## Statistics by Namespace\n")
  for (const [namespace, tokens] of byNamespace) {
    const percentage = ((tokens.length / unusedTokens.length) * 100).toFixed(1)
    report.push(`- ${namespace}: ${tokens.length} tokens (${percentage}%)`)
  }

  return report.join("\n")
}

function logDebugUsage(usage) {
  if (usage.used) {
    console.log(`✅ Found in: ${usage.location}`)
    console.log(`   Type: ${usage.type}`)
    if (usage.match) {
      console.log(`   Match: "${usage.match}"`)
    }
  } else {
    console.log("❌ Token not found")
  }
}

/**
 * Check every token (or only the --token= one) and return the unused ones
 */
function findUnusedTokens(allTokens, debugToken) {
  const unusedTokens = []
  let checked = 0

  for (const [token, info] of allTokens) {
    // Debug specific token
    if (debugToken && token !== debugToken) {
      continue
    }

    checked += 1
    if (!debugMode && checked % 25 === 0) {
      process.stdout.write(`\rChecked ${checked}/${allTokens.size} tokens...`)
    }

    if (debugMode) {
      console.log(`\nChecking token: ${token}`)
      const utilities = generatePossibleUtilities(token)
      const more = utilities.length > 10 ? "..." : ""
      console.log(
        `Possible utilities: ${utilities.slice(0, 10).join(", ")}${more}`
      )
    }

    const usage = isTokenUsed(token, allTokens)
    if (!usage.used) {
      unusedTokens.push({ token, ...info })
    }
    if (debugMode) {
      logDebugUsage(usage)
    }
  }

  return unusedTokens
}

function reportUnusedTokens(unusedTokens, allTokens) {
  console.log(`⚠️  Found ${unusedTokens.length} unused tokens`)

  // Generate and save detailed report
  const report = generateReport(unusedTokens, allTokens)
  const reportPath = "unused-tokens-report.md"
  fs.writeFileSync(reportPath, report)
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)

  // Show summary
  const percent = (count) => ((count / allTokens.size) * 100).toFixed(1)
  const usedCount = allTokens.size - unusedTokens.length
  console.log("\n📊 Summary:")
  console.log(`   Total tokens: ${allTokens.size}`)
  console.log(
    `   Unused tokens: ${unusedTokens.length} (${percent(unusedTokens.length)}%)`
  )
  console.log(`   Used tokens: ${usedCount} (${percent(usedCount)}%)`)
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  debugMode = args.includes("--debug")
  const debugToken = args
    .find((arg) => arg.startsWith("--token="))
    ?.split("=")[1]

  console.log("🔍 Checking for unused CSS tokens (Tailwind v4 optimized)...\n")

  // Find all token files
  const tokenFiles = getTokenFiles()
  console.log(`Found ${tokenFiles.length} token files to analyze`)

  // Extract all tokens
  const allTokens = new Map()
  for (const file of tokenFiles) {
    for (const [token, info] of extractTokensFromFile(file)) {
      allTokens.set(token, info)
    }
  }

  console.log(`Found ${allTokens.size} total tokens\n`)
  console.log("Checking usage (this may take a moment)...\n")

  const unusedTokens = findUnusedTokens(allTokens, debugToken)

  console.log("\n")

  // Display results
  if (unusedTokens.length === 0) {
    console.log("✅ All tokens are being used!")
  } else {
    reportUnusedTokens(unusedTokens, allTokens)
  }
}

// Run the script
try {
  main()
} catch (error) {
  console.error(error)
}
