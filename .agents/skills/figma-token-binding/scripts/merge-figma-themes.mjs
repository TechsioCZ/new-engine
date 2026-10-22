#!/usr/bin/env node
/* Merge per-mode Figma exports into Tailwind tokens and brand overrides.
 * Identical values are shared. Only known single colors may use light-dark();
 * differing non-color values are rejected before either output is written.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.."
)
const FIGMA_DIR = join(REPO_ROOT, "libs/ui/src/tokens/figma")
const BASE = { light: "light", dark: "dark" }
const BRANDS = [
  { attr: "neo", light: "neo", dark: "neo-dark" },
  // Light-only brands reuse their light export for both modes.
  { attr: "business", light: "business", dark: "business" },
  { attr: "akros", light: "akros", dark: "akros" },
]

// Keep strings and CSS escapes intact. In particular, whitespace terminating a
// hexadecimal escape is part of that token, not formatting to be discarded.
const WHITESPACE = /[\t\n\f\r ]/
const WORD_END = /[\t\n\f\r ():;,/{}"']/
const HEX_ESCAPE = /^[\da-f]{1,6}(?:\r\n|[\t\n\f\r ])?/i

function stringEnd(css, start) {
  let end = start + 1
  while (end < css.length && css[end] !== css[start]) {
    end += css[end] === "\\" ? 2 : 1
  }
  if (end >= css.length) {
    throw new Error("Unclosed CSS string")
  }
  return end + 1
}

function wordEnd(css, start) {
  let end = start
  while (end < css.length && !WORD_END.test(css[end])) {
    if (css[end] === "\\") {
      end += 1
      const hex = css.slice(end).match(HEX_ESCAPE)?.[0]
      end += hex ? hex.length : 1
    } else {
      end += 1
    }
  }
  return end
}

function readToken(css, start) {
  const char = css[start]
  if (WHITESPACE.test(char)) {
    let end = start + 1
    while (end < css.length && WHITESPACE.test(css[end])) {
      end += 1
    }
    return { type: "space", value: " ", end }
  }
  if (css.startsWith("/*", start)) {
    const end = css.indexOf("*/", start + 2)
    if (end === -1) {
      throw new Error("Unclosed CSS comment")
    }
    return { type: "space", value: " ", end: end + 2 }
  }
  if (char === '"' || char === "'") {
    const end = stringEnd(css, start)
    return { type: "string", value: css.slice(start, end), end }
  }
  if ("():;,/{}".includes(char)) {
    return { type: "punctuation", value: char, end: start + 1 }
  }
  const end = wordEnd(css, start)
  return { type: "word", value: css.slice(start, end), end }
}

function tokenize(css) {
  const tokens = []
  for (let i = 0; i < css.length; ) {
    const token = readToken(css, i)
    tokens.push(token)
    i = token.end
  }
  return tokens
}

/** Normalize insignificant CSS whitespace, never the contents of strings. */
export function normalizeValue(value) {
  const tokens = tokenize(value)
  const significant = tokens.filter(({ type }) => type !== "space")
  // Missing hue keeps derived neutral greys from drifting toward red.
  for (let i = 0; i < significant.length - 5; i += 1) {
    const parts = significant.slice(i, i + 6)
    if (
      parts[0].type === "word" &&
      parts[0].value.toLowerCase() === "oklch" &&
      parts[1].value === "(" &&
      parts[3].value === "0" &&
      parts[4].value === "0" &&
      [")", "/"].includes(parts[5].value)
    ) {
      parts[4].value = "none"
    }
  }
  const result = []
  let space = false
  let previous
  for (const token of tokens) {
    if (token.type === "space") {
      space = true
      continue
    }
    if (
      space &&
      previous &&
      !["(", ",", "/"].includes(previous.value) &&
      ![")", ",", "/"].includes(token.value)
    ) {
      result.push(" ")
    }
    result.push(token.value)
    previous = token
    space = false
  }
  return result.join("")
}

function declarationEnd(tokens, start, name) {
  let depth = 0
  for (let end = start; end < tokens.length; end += 1) {
    const part = tokens[end]
    if (part.type !== "punctuation") {
      continue
    }
    if (depth === 0 && [";", "}"].includes(part.value)) {
      return end
    }
    if (part.value === "(") {
      depth += 1
    }
    if (part.value === ")") {
      depth -= 1
    }
    if (depth < 0 || ["{", "}"].includes(part.value)) {
      throw new Error(`Invalid value for ${name}`)
    }
  }
  throw new Error(`Unterminated declaration ${name}`)
}

/** Parse CSS source, rather than reading files. Quoted semicolons stay intact. */
export function parseDecls(css) {
  const tokens = tokenize(css)
  const declarations = new Map()
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type !== "word" || !/^--[a-z0-9-]+$/.test(token.value)) {
      continue
    }
    let colon = i + 1
    while (tokens[colon]?.type === "space") {
      colon += 1
    }
    if (tokens[colon]?.value !== ":") {
      continue
    }
    const end = declarationEnd(tokens, colon + 1, token.value)
    const value = normalizeValue(
      tokens
        .slice(colon + 1, end)
        .map((part) => part.value)
        .join("")
    )
    if (!value || declarations.has(token.value)) {
      throw new Error(`Empty or duplicate declaration ${token.value}`)
    }
    declarations.set(token.value, value)
    i = end
  }
  return declarations
}

function exactRem(value, pixels) {
  const rem = value.match(/^(\d*\.?\d+)rem$/)?.[1]
  if (rem === undefined) {
    return false
  }
  const [integer, fraction = ""] = rem.split(".")
  // Decimal arithmetic, not an epsilon or a float-rounded equality check.
  return (
    BigInt((integer || "0") + fraction) * 16n ===
    pixels * 10n ** BigInt(fraction.length)
  )
}

function remFromPixels(pixels, precision = 4) {
  const scale = 10n ** BigInt(precision)
  const digits = String((pixels * scale + 8n) / 16n).padStart(
    precision + 1,
    "0"
  )
  const rem = `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
    .replace(/0+$/, "")
    .replace(/\.$/, "")
  return `${rem}rem`
}

/** Convert only known legacy Figma encodings, before strict validation.
 * The export plugin rounded pixel primitives to two rem decimals and treated
 * brightness percentages as lengths. Do not relax mergeMode's CSS contracts or
 * silently repair arbitrary invalid values supplied by future exports.
 */
function convertRawExport(declarations) {
  return new Map(
    [...declarations].map(([name, value]) => {
      const pixels = name.match(/^--dimension-(\d+)$/)?.[1]
      if (pixels !== undefined) {
        // Historical dimension-700 is the 70px primitive, not 700px.
        const px = BigInt(pixels === "700" ? "70" : pixels)
        if (value === remFromPixels(px, 2)) {
          return [name, remFromPixels(px)]
        }
      }
      if (name === "--brightness-100" && value === "6.25rem") {
        return [name, "1"]
      }
      if (name === "--brightness-70" && value === "4.38rem") {
        return [name, "0.7"]
      }
      return [name, value]
    })
  )
}

function validateDimension(name, value) {
  const pixels = name.match(/^--dimension-(\d+)$/)?.[1]
  if (pixels === undefined) {
    return
  }
  // Historical typo: 700 means 70px, not 700px. Preserve existing consumers.
  const px = BigInt(pixels === "700" ? "70" : pixels)
  const expected = `${px / 16n}.${String((px % 16n) * 625n).padStart(4, "0")}`
    .replace(/0+$/, "")
    .replace(/\.$/, "")
  const legacyAlias =
    name === "--dimension-700" && value === "var(--dimension-70)"
  if (!(legacyAlias || exactRem(value, px))) {
    throw new Error(
      `${name}: expected exactly ${expected}rem${name === "--dimension-700" ? " or var(--dimension-70)" : ""}, got ${value}`
    )
  }
}

function validateBrightness(name, value, declarations) {
  if (!name.startsWith("--brightness-")) {
    return
  }
  let factor = value
  const seen = new Set([name])
  while (factor.startsWith("var(")) {
    const alias = factor.match(/^var\((--[a-z0-9-]+)\)$/)?.[1]
    if (!alias || seen.has(alias) || !declarations.has(alias)) {
      throw new Error(
        `${name}: brightness must resolve to a unitless factor or percentage`
      )
    }
    seen.add(alias)
    factor = normalizeValue(declarations.get(alias))
  }
  if (!/^(?:\d*\.)?\d+%?$/.test(factor)) {
    throw new Error(
      `${name}: brightness must be a unitless factor or percentage, got ${factor}`
    )
  }
}

/** Check primitive contracts before serialization (Figma's rounded rems fail). */
export function validateDeclarations(declarations) {
  for (const [name, raw] of declarations) {
    const value = normalizeValue(raw)
    validateDimension(name, value)
    validateBrightness(name, value, declarations)
  }
}

const COLOR_KEYWORDS = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor".split(
    " "
  )
)

const COLOR_NUMBER = "[+-]?(?:\\d*\\.)?\\d+(?:e[+-]?\\d+)?"

function splitColorMixArgs(args) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "(") {
      depth += 1
    }
    if (args[i] === ")") {
      depth -= 1
    }
    if (depth < 0) {
      return []
    }
    if (args[i] === "," && depth === 0) {
      parts.push(args.slice(start, i))
      start = i + 1
    }
  }
  parts.push(args.slice(start))
  return depth === 0 ? parts : []
}

function isColorMix(args) {
  const parts = splitColorMixArgs(args)
  if (parts.length !== 3) {
    return false
  }
  if (
    !/^in (?:srgb(?:-linear)?|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|oklab|xyz(?:-d(?:50|65))?|(?:hsl|hwb|lch|oklch)(?: (?:shorter|longer|increasing|decreasing) hue)?)$/i.test(
      parts[0]
    )
  ) {
    return false
  }
  const weights = []
  for (const part of parts.slice(1)) {
    const percentage = part.match(new RegExp(` (${COLOR_NUMBER})%$`, "i"))
    const weight = percentage ? Number(percentage[1]) : undefined
    // Unlike RGB channels, mix percentages are invalid outside [0, 100],
    // not clamped. Two explicit zero weights cannot be normalized either.
    if (weight !== undefined && !(weight >= 0 && weight <= 100)) {
      return false
    }
    const color = percentage ? part.slice(0, percentage.index) : part
    if (!isSingleColor(color)) {
      return false
    }
    weights.push(weight)
  }
  return !(weights[0] === 0 && weights[1] === 0)
}

/** Conservative recognition: no shadows, lists, strings, or non-color aliases. */
export function isSingleColor(value) {
  if (/^#[\da-f]{3}(?:[\da-f]|[\da-f]{3}|[\da-f]{5})?$/i.test(value)) {
    return true
  }
  if (COLOR_KEYWORDS.has(value.toLowerCase())) {
    return true
  }
  if (/^var\(--color-[a-z0-9-]+\)$/.test(value)) {
    return true
  }
  const normalized = normalizeValue(value)
  const match = normalized.match(/^([a-z-]+)\((.*)\)$/i)
  if (!match) {
    return false
  }
  const [, rawFunction, args] = match
  const fn = rawFunction.toLowerCase()
  const number = COLOR_NUMBER
  const channel = `(?:${number}%?|none)`
  const angle = `${number}(?:deg|grad|rad|turn)?`
  const hue = `(?:${angle}|none)`
  const alpha = `(?:/${channel})?`
  const legacyAlpha = `(?:,${number}%?)?`
  if (fn === "color-mix") {
    return isColorMix(args)
  }
  let pattern
  if (["rgb", "rgba"].includes(fn)) {
    // Legacy comma syntax requires three numbers OR three percentages and
    // disallows missing components (none), including in the alpha channel.
    const legacy = ["", "%"].map((unit) => {
      const component = `${number}${unit}`
      return `${component},${component},${component}${legacyAlpha}`
    })
    pattern = `(?:${channel} ${channel} ${channel}${alpha}|${legacy.join("|")})`
  } else if (["hsl", "hsla"].includes(fn)) {
    const percent = `(?:${number}%|none)`
    pattern = `(?:${hue} ${percent} ${percent}${alpha}|${angle},${number}%,${number}%${legacyAlpha})`
  } else if (fn === "hwb") {
    pattern = `${hue} (?:${number}%|none) (?:${number}%|none)${alpha}`
  } else if (["oklch", "lch"].includes(fn)) {
    pattern = `${channel} ${channel} ${hue}${alpha}`
  } else if (["oklab", "lab"].includes(fn)) {
    pattern = `${channel} ${channel} ${channel}${alpha}`
  } else if (fn === "color") {
    pattern = `(?:srgb(?:-linear)?|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz(?:-d(?:50|65))?) ${channel} ${channel} ${channel}${alpha}`
  } else {
    return false
  }
  return new RegExp(`^(?:${pattern})$`, "i").test(args)
}

/** Merge normalized maps without mutating inputs or touching the filesystem. */
export function mergeMode(lightDecls, darkDecls) {
  validateDeclarations(lightDecls)
  validateDeclarations(darkDecls)
  const merged = new Map()
  const names = [...new Set([...lightDecls.keys(), ...darkDecls.keys()])].sort()
  for (const name of names) {
    const L = lightDecls.has(name)
      ? normalizeValue(lightDecls.get(name))
      : undefined
    const D = darkDecls.has(name)
      ? normalizeValue(darkDecls.get(name))
      : undefined
    if (L === undefined) {
      merged.set(name, D)
    } else if (D === undefined || L === D) {
      merged.set(name, L)
    } else if (
      (name.startsWith("--color-") || name === "--default-ring-color") &&
      isSingleColor(L) &&
      isSingleColor(D)
    ) {
      merged.set(name, `light-dark(${L}, ${D})`)
    } else {
      throw new Error(
        `${name}: differing non-color or unsupported color values require explicit mode scopes (${L} / ${D})`
      )
    }
  }
  return merged
}

/** Prepare and validate ALL brands before the writing entrypoint can run. */
export function buildExports(baseModes, brands = []) {
  const base = mergeMode(baseModes.light, baseModes.dark)
  const mergedBrands = brands.map((brand) => ({
    attr: brand.attr,
    merged: mergeMode(brand.light, brand.dark),
  }))
  const variables = [
    "/* Unified Figma tokens — generated by merge-figma-themes.mjs. DO NOT EDIT. */",
    "@theme static {",
    ...[...base].map(([name, value]) => `  ${name}: ${value};`),
    "}",
    "",
  ].join("\n")
  const overrides = [
    "/* Brand overrides — generated by merge-figma-themes.mjs. DO NOT EDIT. */",
    ...mergedBrands.flatMap(({ attr, merged }) => {
      if (!/^[a-z][a-z0-9-]*$/.test(attr)) {
        throw new Error(`Invalid brand attribute: ${attr}`)
      }
      return [
        `[data-theme="${attr}"] {`,
        ...[...merged]
          .filter(([name, value]) => value !== base.get(name))
          .map(([name, value]) => `  ${name}: ${value};`),
        "}",
        "",
      ]
    }),
  ].join("\n")
  return { variables, overrides }
}

export function main({
  figmaDir = FIGMA_DIR,
  base = BASE,
  brands = BRANDS,
} = {}) {
  const readModes = (modes) =>
    Object.fromEntries(
      ["light", "dark"].map((mode) => [
        mode,
        convertRawExport(
          parseDecls(
            readFileSync(join(figmaDir, modes[mode], "variables.css"), "utf8")
          )
        ),
      ])
    )
  const outputs = buildExports(
    readModes(base),
    brands.map((brand) => ({
      attr: brand.attr,
      ...readModes(brand),
    }))
  )
  // Validation and rendering have both completed; invalid inputs cannot rewrite
  // even the first output (including errors in the last brand).
  writeFileSync(join(figmaDir, "variables.css"), outputs.variables)
  writeFileSync(join(figmaDir, "brand-overrides.css"), outputs.overrides)
  console.log(`Wrote merged Figma exports in ${figmaDir}`)
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main()
}
