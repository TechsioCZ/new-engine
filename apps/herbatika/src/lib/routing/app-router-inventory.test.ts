import { readdirSync } from "node:fs"
import { basename, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const appDirectory = fileURLToPath(new URL("../../app", import.meta.url))

const listRouteFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name)

    return entry.isDirectory() ? listRouteFiles(entryPath) : [entryPath]
  })

describe("App Router route inventory", () => {
  it("contains no public HTML routes or route-only loading shells", () => {
    const obsoletePublicArtifacts = listRouteFiles(appDirectory)
      .filter((filePath) => {
        const fileName = basename(filePath)
        const relativePath = relative(appDirectory, filePath)

        return (
          fileName === "page.tsx" ||
          fileName === "loading.tsx" ||
          (fileName === "layout.tsx" && relativePath !== "layout.tsx")
        )
      })
      .map((filePath) => relative(appDirectory, filePath))
      .sort()

    expect(obsoletePublicArtifacts).toEqual([])
  })
})
