import { readdirSync } from "node:fs"
import { basename, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const appDirectory = fileURLToPath(new URL("../../app", import.meta.url))
const GATE_OFF_COMPATIBILITY_ARTIFACTS = [
  "[slug]/page.tsx",
  "account/deactivate/confirm/page.tsx",
  "account/layout.tsx",
  "account/lists/page.tsx",
  "account/loading.tsx",
  "account/orders/[id]/loading.tsx",
  "account/orders/[id]/page.tsx",
  "account/orders/page.tsx",
  "account/page.tsx",
  "account/settings/page.tsx",
  "auth/forgot-password/loading.tsx",
  "auth/forgot-password/page.tsx",
  "auth/login/loading.tsx",
  "auth/login/page.tsx",
  "auth/register/loading.tsx",
  "auth/register/page.tsx",
  "auth/reset-password/loading.tsx",
  "auth/reset-password/page.tsx",
  "blog/[slug]/page.tsx",
  "blog/page.tsx",
  "c/[slug]/loading.tsx",
  "c/[slug]/page.tsx",
  "checkout/[step]/page.tsx",
  "checkout/page.tsx",
  "checkout/platba-navrat/page.tsx",
  "faq/page.tsx",
  "loading.tsx",
  "p/[handle]/loading.tsx",
  "p/[handle]/page.tsx",
  "page.tsx",
  "reklamacie-a-vratenie/page.tsx",
  "reset-password/page.tsx",
  "reviews/product/[token]/page.tsx",
  "search/loading.tsx",
  "search/page.tsx",
  "znacka/[slug]/loading.tsx",
  "znacka/[slug]/page.tsx",
  "znacka/page.tsx",
].sort()

const listRouteFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name)

    return entry.isDirectory() ? listRouteFiles(entryPath) : [entryPath]
  })

describe("App Router route inventory", () => {
  it("contains only the exact gate-off compatibility surface", () => {
    const publicRouteArtifacts = listRouteFiles(appDirectory)
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

    expect(publicRouteArtifacts).toEqual(GATE_OFF_COMPATIBILITY_ARTIFACTS)
  })
})
