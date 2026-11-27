import { glob, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import tailwind from "@tailwindcss/postcss"
import postcss from "postcss"

const uiRoot = path.resolve(import.meta.dirname, "..")
const tokensDir = path.join(uiRoot, "src/tokens")
const entry = path.join(tokensDir, "index.css")
export const compiledCssPath = path.join(uiRoot, "dist/ui-kit.css")

/**
 * Every static utility the kit defines with `@utility` (token-icon-* glyphs,
 * popup-*, tour-*, …). A consumer can pass any of them as a prop value, so the
 * precompiled stylesheet carries all of them, not only those the components
 * name. Functional utilities (`corner-*`) and arbitrary iconify classes
 * (`icon-[mdi--x]`) are unbounded and stay out.
 */
export async function kitUtilityNames() {
  const names = new Set()
  for await (const file of glob("**/*.css", { cwd: tokensDir })) {
    const css = await readFile(path.join(tokensDir, file), "utf8")
    for (const [, name] of css.matchAll(/@utility\s+([\w-]+)\s*\{/g)) {
      names.add(name)
    }
  }
  return [...names].sort()
}

const palette = new Set(
  "slate gray zinc neutral stone red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose black white".split(
    " "
  )
)

/** Names declared as `--<namespace>-<name>:` in a token file. */
async function tokenNames(file, namespace, name = "[\\w-]+") {
  const css = await readFile(path.join(tokensDir, file), "utf8")
  const declaration = new RegExp(`^\\s*--${namespace}-(${name})\\s*:`, "gm")
  return [
    ...new Set(Array.from(css.matchAll(declaration), ([, match]) => match)),
  ]
}

const braceGroup = /\{([^{}]*)\}/
const braceRange = /^(\d+)\.\.(\d+)(?:\.\.(\d+))?$/

const anyOf = (values) => `{${values.join(",")}}`

/**
 * Expands one Tailwind `@source inline` pattern the way Tailwind does:
 * `{a,b,}` alternatives and `{from..to[..step]}` ranges, sequential or
 * nested (the innermost group expands first).
 */
function expand(pattern) {
  const group = braceGroup.exec(pattern)
  if (!group) {
    return [pattern]
  }
  const range = braceRange.exec(group[1])
  const options = range
    ? Array.from(
        {
          length:
            Math.floor(
              (Number(range[2]) - Number(range[1])) / Number(range[3] ?? 1)
            ) + 1,
        },
        (_, index) => String(Number(range[1]) + index * Number(range[3] ?? 1))
      )
    : group[1].split(",")
  const head = pattern.slice(0, group.index)
  const tail = pattern.slice(group.index + group[0].length)
  return options.flatMap((option) => expand(head + option + tail))
}

/**
 * The token-backed utilities an app may write against styles.css without
 * running Tailwind, as `@source inline` patterns. Token names come from the
 * token files, so a rename or a new token moves the vocabulary with it.
 */
async function consumerVocabularyPatterns() {
  const [
    spacing,
    containers,
    aspects,
    breakpoints,
    colors,
    textSizes,
    fontWeights,
    radii,
    shadows,
  ] = await Promise.all([
    tokenNames("_spacing.css", "spacing", "\\d+"),
    tokenNames("_layout.css", "container"),
    tokenNames("_layout.css", "aspect"),
    tokenNames("_layout.css", "breakpoint"),
    tokenNames("_semantic.css", "color"),
    tokenNames("_typography.css", "text", "[a-z0-9]+"),
    tokenNames("_typography.css", "font-weight"),
    tokenNames("_base.css", "radius"),
    tokenNames("_base.css", "shadow"),
  ])
  const semanticColors = colors.filter(
    (name) => !palette.has(name.split("-")[0])
  )
  const responsive = (pattern) =>
    `${anyOf([...breakpoints.map((breakpoint) => `${breakpoint}:`), ""])}${pattern}`
  const spacingValues = anyOf(["0", "px", ...spacing])
  const sizes = "{w,h,size,min-w,min-h,max-w,max-h}"
  const alignment = "{start,center,end,between,around,evenly,stretch,baseline}"

  const layout = [
    // Spacing and sizing
    `{p,px,py,pt,pr,pb,pl,ps,pe,m,mx,my,mt,mr,mb,ml,ms,me,gap,gap-x,gap-y,space-x,space-y}-${spacingValues}`,
    "{m,mx,my,mt,mr,mb,ml,ms,me}-auto",
    `${sizes}-${spacingValues}`,
    "{w,h,size,min-w,min-h}-{full,auto,fit,min,max}",
    "{max-w,max-h}-{full,fit,min,max,none}",
    "{w,h,min-w,min-h,max-w,max-h}-screen",
    `{w,max-w}-${anyOf(containers)}`,
    "{top,right,bottom,left,inset}-{0,full}",
    // Display, flex and grid
    "block inline-block inline flex inline-flex grid inline-grid hidden contents",
    "flex-{row,col,row-reverse,col-reverse,wrap,nowrap,1,auto,none} grow grow-0 shrink shrink-0",
    "items-{start,center,end,stretch,baseline}",
    `justify-${alignment}`,
    "justify-items-{start,center,end,stretch}",
    "justify-self-{auto,start,center,end,stretch}",
    "self-{auto,start,center,end,stretch,baseline}",
    `content-${alignment}`,
    "place-items-{start,center,end,stretch,baseline}",
    `place-content-${alignment}`,
    "grid-cols-{{1..12},none} col-span-{{1..12},full} grid-rows-{1..6} row-span-{1..6}",
    "grid-flow-{row,col,dense}",
    // Position, overflow and visibility
    "static relative absolute fixed sticky",
    "{overflow,overflow-x,overflow-y}-{auto,hidden,visible,scroll,clip}",
    "visible invisible sr-only not-sr-only",
    "object-{cover,contain}",
    `aspect-${anyOf(aspects)}`,
    // Text size and alignment
    `text-${anyOf(textSizes)}`,
    "text-{left,center,right,start,end}",
  ]
  return [
    ...layout.flatMap((patterns) => patterns.split(" ").map(responsive)),
    // Semantic colours, bare and in their interaction states
    `{,hover:,focus-visible:,disabled:}{text,bg,border,ring,outline,fill,stroke,divide,placeholder}-${anyOf(semanticColors)}`,
    // Typography
    `font-${anyOf(fontWeights)} font-sans font-mono`,
    "uppercase lowercase capitalize normal-case italic not-italic",
    "{,hover:}underline no-underline line-through",
    "align-{top,middle,bottom,baseline}",
    "tracking-{tight,normal,wide} leading-{none,tight,snug,normal,relaxed}",
    "truncate line-clamp-{1..6} whitespace-{normal,nowrap,pre,pre-line,pre-wrap}",
    "break-words break-all tabular-nums",
    // Shape
    `rounded{,-t,-b,-l,-r,-s,-e}{,-none,${radii.map((radius) => `-${radius}`).join(",")}}`,
    `shadow-${anyOf([...shadows, "none"])}`,
    "border{,-0,-2,-t,-b,-l,-r,-x,-y,-s,-e} divide-{x,y} border-{solid,dashed,none}",
    // Behaviour
    "z-{{0..50..10},auto} isolate",
    "cursor-{pointer,default,not-allowed,text,move,grab,wait}",
    "pointer-events-{none,auto} select-{none,text,all}",
    "list-{none,disc,decimal,inside}",
    "opacity-{0..100..10}",
    "transition{,-colors,-opacity,-transform} animate-{pulse,spin}",
    "print:hidden",
  ].flatMap((patterns) => patterns.split(" "))
}

/**
 * Every class of the consumer vocabulary: what an app that loads styles.css
 * and runs no Tailwind may write besides the kit components.
 */
export async function consumerVocabulary() {
  return [...new Set((await consumerVocabularyPatterns()).flatMap(expand))]
}

/**
 * Compiles src/tokens/index.css into dist/ui-kit.css: Tailwind, tw-animate-css
 * and every token, generated only from the published component JavaScript
 * (index.css's own `@source "../../dist/**\/*.js"`) plus the kit utilities
 * and the consumer vocabulary.
 * Run after rslib has emitted dist JS.
 */
export async function writeCompiledCss() {
  const source = await readFile(entry, "utf8")
  const tailwindImport = '@import "tailwindcss";'
  if (!source.includes(tailwindImport)) {
    throw new Error(`${entry} no longer contains ${tailwindImport}`)
  }
  // source(none) drops automatic detection, which would also scan stories and
  // tests; the explicit @source of shipped dist JS still applies.
  const css = `${source.replace(
    tailwindImport,
    '@import "tailwindcss" source(none);'
  )}\n@source inline("${[
    ...(await kitUtilityNames()),
    ...(await consumerVocabularyPatterns()),
  ].join(" ")}");\n`
  const result = await postcss([
    tailwind({ base: uiRoot, optimize: { minify: true } }),
  ]).process(css, { from: entry, to: compiledCssPath })
  await writeFile(compiledCssPath, result.css)
}
