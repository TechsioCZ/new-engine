import { readdirSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const sourceRoot = fileURLToPath(new URL("../..", import.meta.url))
const pagesRoot = resolve(sourceRoot, "pages")
const IMPORT_PATTERN = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g
const SERVER_SPECIFIER =
  /(?:\.server$|\/public-page$|\/storefront\/(?:cms|ssr)(?:\/|$)|\/url-registry\/runtime\/)/
const TYPE_ONLY_IMPORT = /^type\b/
const IMPORT_ALIAS = /\s+as\s+/
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const SOURCE_FILE = /\.[cm]?[jt]sx?$/

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listSourceFiles(path) : [path]
  })

const importedValueNames = (clause: string) => {
  if (TYPE_ONLY_IMPORT.test(clause.trim())) {
    return []
  }

  const withoutTypeImports = clause.replace(/\btype\s+[\w$]+\s*,?/g, "")
  return withoutTypeImports
    .replace(/[{}]/g, "")
    .split(",")
    .map((part) => part.trim().split(IMPORT_ALIAS).at(-1)?.trim() ?? "")
    .filter((name) => IDENTIFIER.test(name))
}

describe("Pages Router server boundary", () => {
  it("keeps App-only request APIs and poison markers out of Pages modules", () => {
    const offenders = listSourceFiles(pagesRoot)
      .filter((path) => SOURCE_FILE.test(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8")
        return source.includes('from "next/headers"') ||
          source.includes('import "server-only"')
          ? [relative(sourceRoot, path)]
          : []
      })

    expect(offenders).toEqual([])
  })

  it("never references a server import from a page render component", () => {
    const offenders = listSourceFiles(pagesRoot)
      .filter((path) => SOURCE_FILE.test(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8")
        const renderStart = source.indexOf("export default")
        if (renderStart < 0) {
          return []
        }
        const renderSource = source.slice(renderStart)
        return Array.from(source.matchAll(IMPORT_PATTERN)).flatMap(
          ([, clause, specifier]) => {
            if (!SERVER_SPECIFIER.test(specifier)) {
              return []
            }
            return importedValueNames(clause).flatMap((name) =>
              new RegExp(`\\b${name}\\b`).test(renderSource)
                ? [`${relative(sourceRoot, path)}: ${name} from ${specifier}`]
                : []
            )
          }
        )
      })

    expect(offenders).toEqual([])
  })

  it("keeps implicit App header resolution isolated from Pages SSR", () => {
    const pagesContext = readFileSync(
      resolve(sourceRoot, "lib/storefront/ssr/context.ts"),
      "utf8"
    )
    const appContext = readFileSync(
      resolve(sourceRoot, "lib/storefront/ssr/context.app.server.ts"),
      "utf8"
    )
    const appMarketContext = readFileSync(
      resolve(sourceRoot, "lib/storefront/market-context.server.ts"),
      "utf8"
    )

    expect(pagesContext).not.toContain("next/headers")
    expect(pagesContext).not.toContain(
      "resolveConfiguredMarketRuntimeBindingByHost"
    )
    expect(appContext).toContain('import "server-only"')
    expect(appContext).toContain("getMarketServerContext")
    expect(appContext).not.toContain('from "next/headers"')
    expect(appMarketContext).toContain('from "next/headers"')
    expect(appMarketContext).toContain('headerStore.get("x-sf-market")')
    expect(appMarketContext).toContain(
      'headerStore.get("x-sf-canonical-origin")'
    )
  })
})
