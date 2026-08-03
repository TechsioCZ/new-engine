#!/usr/bin/env node

/**
 * Optimized script to check for unused CSS custom properties (tokens) in Tailwind v4
 *
 * This version understands Tailwind v4 namespace patterns and checks for actual usage
 * in both CSS and JS/TS files with better accuracy and performance.
 */

import fs from "fs"
import path from "path"

import { globSync } from "glob"

// Configuration
const TOKEN_DIRS = ["src/tokens"]
const SEARCH_DIRS = ["src/atoms", "src/molecules", "stories"]
const TOKEN_FILE_PATTERN = "**/*.css"
const SOURCE_FILE_PATTERN = "**/*.{ts,tsx,js,jsx,css}"

// Tailwind v4 namespace to utility class prefixes mapping
const NAMESPACE_TO_UTILITIES = {
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
  "font-weight": ["font"],
  font: ["font"],
  border: ["border"],
  radius: ["rounded"],
  shadow: ["shadow"],
  opacity: ["opacity"],
  width: ["w"],
  height: ["h"],
  gap: ["gap"],
  padding: ["p", "px", "py", "pt", "pb", "pl", "pr"],
  margin: ["m", "mx", "my", "mt", "mb", "ml", "mr"],
  "line-height": ["leading"],
  ring: ["ring"],
  aspect: ["aspect"],
  leading: ["leading"],
}

// Cache for file contents to avoid re-reading
const fileCache = new Map()

/**
 * Read file with caching
 */
function readFileWithCache(filePath) {
  if (!fileCache.has(filePath)) {
    fileCache.set(filePath, fs.readFileSync(filePath, "utf-8"))
  }
  return fileCache.get(filePath)
}

/**
 * Extract namespace from token name
 * --color-btn-primary -> 'color'
 * --spacing-button-sm -> 'spacing'
 */
function getTokenNamespace(token) {
  const match = token.match(/^--([^-]+)-/)
  return match ? match[1] : null
}

/**
 * Get the token name without namespace prefix
 * --color-btn-primary -> btn-primary
 * --spacing-button-sm -> button-sm
 */
function getTokenNameWithoutNamespace(token) {
  const match = token.match(/^--[^-]+-(.+)$/)
  return match ? match[1] : token.replace(/^--/, "")
}

/**
 * Generate all possible utility classes for a token
 */
function generatePossibleUtilities(token) {
  const namespace = getTokenNamespace(token)
  const nameWithoutNamespace = getTokenNameWithoutNamespace(token)

  if (!(namespace && NAMESPACE_TO_UTILITIES[namespace])) {
    // If no namespace match, return the token name for direct usage checks
    return [nameWithoutNamespace]
  }

  const utilities = []
  const prefixes = NAMESPACE_TO_UTILITIES[namespace]

  prefixes.forEach((prefix) => {
    // Direct mapping
    utilities.push(`${prefix}-${nameWithoutNamespace}`)

    // Handle negative utilities (like -m-4)
    utilities.push(`-${prefix}-${nameWithoutNamespace}`)

    // Handle arbitrary value syntax (though less common with custom properties)
    utilities.push(`${prefix}-[var(${token})]`)
  })

  // Also check for direct CSS variable usage
  utilities.push(`var(${token})`)
  utilities.push(token)

  return [...new Set(utilities)]
}

/**
 * Extract all tokens from a CSS file
 */
function extractTokensFromFile(filePath) {
  const content = readFileWithCache(filePath)
  const tokens = new Map()

  // Match tokens inside @theme blocks and regular :root blocks
  const themeBlockRegex = /@theme\s+(?:static|inline)\s*{([^}]+)}/gs
  const rootBlockRegex = /:root\s*{([^}]+)}/gs

  const extractFromBlock = (block) => {
    const lines = block.split("\n")
    lines.forEach((line, index) => {
      // Match CSS custom properties (more precise regex)
      const match = line.match(/^\s*(--[\w-]+)\s*:/)
      if (match) {
        tokens.set(match[1], {
          file: filePath,
          line: index + 1,
          inThemeBlock: block.includes("@theme"),
        })
      }
    })
  }

  // Extract from @theme blocks
  let match
  while ((match = themeBlockRegex.exec(content)) !== null) {
    extractFromBlock(match[0])
  }

  // Extract from :root blocks (legacy tokens)
  while ((match = rootBlockRegex.exec(content)) !== null) {
    extractFromBlock(match[0])
  }

  return tokens
}

/**
 * Create efficient search patterns for a token
 */
function createSearchPatterns(utilities) {
  return utilities.flatMap((utility) => {
    // Escape special regex characters
    const escaped = utility.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

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
 * Check if a token is used in the codebase
 */
function isTokenUsed(token, allTokens) {
  const possibleUtilities = generatePossibleUtilities(token)
  const searchPatterns = createSearchPatterns(possibleUtilities)

  // First, check if it's used in other CSS files (calc, var references, etc.)
  const tokenFiles = globSync(path.join(TOKEN_DIRS[0], TOKEN_FILE_PATTERN))
  const tokenInfo = allTokens.get(token)

  // Check if token is used within the same file (helper tokens)
  const sameFileContent = readFileWithCache(tokenInfo.file)
  // Count how many times the token appears in the file
  const tokenRegex = new RegExp(
    token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "g"
  )
  const matches = sameFileContent.match(tokenRegex) || []
  // If it appears more than once (definition + usage), it's a helper token
  if (matches.length > 1) {
    return { used: true, location: tokenInfo.file, type: "helper-token" }
  }

  // Check usage in other CSS files
  for (const file of tokenFiles) {
    if (file === tokenInfo.file) continue // Skip the file where it's defined

    const content = readFileWithCache(file)
    // Check for direct token usage in calc(), var(), or other CSS functions
    if (content.includes(token)) {
      return { used: true, location: file, type: "css-reference" }
    }
  }

  // Search in source files
  for (const dir of SEARCH_DIRS) {
    const files = globSync(path.join(dir, SOURCE_FILE_PATTERN))

    for (const file of files) {
      const content = readFileWithCache(file)

      // Quick check: if none of the possible utilities appear in the file, skip it
      const quickCheck = possibleUtilities.some((util) => {
        // For simple utility names, check if they appear with common delimiters
        if (!util.includes("var(")) {
          // Simply check if the utility name appears anywhere in the file
          const found = content.includes(util)
          if (debugMode && found) {
            console.log(`  Quick check found "${util}" in ${file}`)
          }
          return found
        }
        return content.includes(util)
      })

      // Also check for special Tailwind v4 syntax like border-(length:--token)
      const specialSyntaxCheck =
        content.includes(`(length:${token})`) ||
        content.includes(`(width:${token})`) ||
        content.includes(`(height:${token})`) ||
        content.includes(`(size:${token})`)

      if (!(quickCheck || specialSyntaxCheck)) {
        if (debugMode) {
          console.log(`  Skipping ${file} - no utilities found in quick check`)
        }
        continue
      }

      // Check for special Tailwind v4 syntax first
      if (specialSyntaxCheck) {
        const specialMatches = [
          content.match(
            new RegExp(
              `\\(length:${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`
            )
          ),
          content.match(
            new RegExp(
              `\\(width:${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`
            )
          ),
          content.match(
            new RegExp(
              `\\(height:${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`
            )
          ),
          content.match(
            new RegExp(
              `\\(size:${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`
            )
          ),
        ].filter((m) => m !== null)

        if (specialMatches.length > 0) {
          const match = specialMatches[0]
          if (debugMode) {
            console.log(`    Special syntax matched: ${match[0]}`)
          }
          return {
            used: true,
            location: file,
            type: "tailwind-v4-syntax",
            match: match[0],
          }
        }
      }

      // Detailed pattern matching
      for (let i = 0; i < searchPatterns.length; i++) {
        const pattern = searchPatterns[i]
        if (pattern.test(content)) {
          // Find the actual match for reporting
          const match = content.match(pattern)
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
    }
  }

  return { used: false }
}

/**
 * Generate detailed report
 */
function generateReport(unusedTokens, allTokens) {
  const report = []

  report.push("# Unused Tokens Report\n")
  report.push(`Generated on: ${new Date().toISOString()}\n`)
  report.push(`Total tokens analyzed: ${allTokens.size}`)
  report.push(`Unused tokens found: ${unusedTokens.length}\n`)

  // Group by file
  const byFile = {}
  unusedTokens.forEach(({ token, ...info }) => {
    if (!byFile[info.file]) {
      byFile[info.file] = []
    }
    byFile[info.file].push({ token, ...info })
  })

  // Generate file sections
  Object.entries(byFile).forEach(([file, tokens]) => {
    report.push(`\n## ${file}\n`)
    tokens.forEach(({ token, line }) => {
      const namespace = getTokenNamespace(token)
      const possibleUtils = generatePossibleUtilities(token)
        .slice(0, 5)
        .join(", ")
      report.push(`- Line ${line}: \`${token}\``)
      report.push(`  - Namespace: ${namespace || "none"}`)
      report.push(`  - Expected utilities: ${possibleUtils}...`)
    })
  })

  // Summary statistics
  const namespaceStats = {}
  unusedTokens.forEach(({ token }) => {
    const namespace = getTokenNamespace(token) || "other"
    namespaceStats[namespace] = (namespaceStats[namespace] || 0) + 1
  })

  report.push("\n## Statistics by Namespace\n")
  Object.entries(namespaceStats).forEach(([namespace, count]) => {
    const percentage = ((count / unusedTokens.length) * 100).toFixed(1)
    report.push(`- ${namespace}: ${count} tokens (${percentage}%)`)
  })

  return report.join("\n")
}

// Global debug mode flag
let debugMode = false

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  debugMode = args.includes("--debug")
  const debugToken = args
    .find((arg) => arg.startsWith("--token="))
    ?.split("=")[1]

  console.log("🔍 Checking for unused CSS tokens (Tailwind v4 optimized)...\n")

  // Find all token files
  const tokenFiles = globSync(path.join(TOKEN_DIRS[0], TOKEN_FILE_PATTERN))
  console.log(`Found ${tokenFiles.length} token files to analyze`)

  // Extract all tokens
  const allTokens = new Map()
  tokenFiles.forEach((file) => {
    const tokens = extractTokensFromFile(file)
    tokens.forEach((info, token) => {
      allTokens.set(token, info)
    })
  })

  console.log(`Found ${allTokens.size} total tokens\n`)
  console.log("Checking usage (this may take a moment)...\n")

  // Check each token
  const unusedTokens = []
  const usageDetails = new Map()
  let checked = 0

  for (const [token, info] of allTokens) {
    // Debug specific token
    if (debugToken && token !== debugToken) continue

    checked++
    if (!debugMode && checked % 25 === 0) {
      process.stdout.write(`\rChecked ${checked}/${allTokens.size} tokens...`)
    }

    if (debugMode && (!debugToken || token === debugToken)) {
      console.log(`\nChecking token: ${token}`)
      const utilities = generatePossibleUtilities(token)
      console.log(
        `Possible utilities: ${utilities.slice(0, 10).join(", ")}${utilities.length > 10 ? "..." : ""}`
      )
    }

    const usage = isTokenUsed(token, allTokens)
    if (usage.used) {
      usageDetails.set(token, usage)
      if (debugMode) {
        console.log(`✅ Found in: ${usage.location}`)
        console.log(`   Type: ${usage.type}`)
        if (usage.match) console.log(`   Match: "${usage.match}"`)
      }
    } else {
      unusedTokens.push({ token, ...info })
      if (debugMode) {
        console.log("❌ Token not found")
      }
    }
  }

  console.log("\n")

  // Display results
  if (unusedTokens.length === 0) {
    console.log("✅ All tokens are being used!")
  } else {
    console.log(`⚠️  Found ${unusedTokens.length} unused tokens`)

    // Generate and save detailed report
    const report = generateReport(unusedTokens, allTokens)
    const reportPath = "unused-tokens-report.md"
    fs.writeFileSync(reportPath, report)
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)

    // Show summary
    console.log("\n📊 Summary:")
    console.log(`   Total tokens: ${allTokens.size}`)
    console.log(
      `   Unused tokens: ${unusedTokens.length} (${((unusedTokens.length / allTokens.size) * 100).toFixed(1)}%)`
    )
    console.log(
      `   Used tokens: ${allTokens.size - unusedTokens.length} (${(((allTokens.size - unusedTokens.length) / allTokens.size) * 100).toFixed(1)}%)`
    )
  }

  // Clear cache
  fileCache.clear()
}

// Run the script
main().catch(console.error)
