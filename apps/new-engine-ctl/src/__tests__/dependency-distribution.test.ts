import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { isRecord } from "@techsio/std/object"
import { describe, expect, test } from "vitest"

const repoRoot = path.resolve(import.meta.dirname, "../../../..")
const contentPluginVersion = "0.2.6"
const contentPluginLicenseSha256 =
  "9b08f6aff3dcf422a81cb26092641d5e97bf9ecb46a04cfbc59ea02d05b8c53d"

const sha256 = (contents: Buffer): string =>
  createHash("sha256").update(contents).digest("hex")

describe("dependency distribution contracts", () => {
  test("ships the approved content plugin license in the backend image", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(
        path.join(repoRoot, "apps/medusa-be/package.json"),
        "utf-8",
      ),
    )
    if (!isRecord(manifest) || !isRecord(manifest["dependencies"])) {
      throw new TypeError("Medusa backend manifest must define dependencies")
    }

    expect(manifest["dependencies"]["medusa-plugin-content"]).toBe(
      contentPluginVersion,
    )

    const licensePath = path.join(
      repoRoot,
      "apps/medusa-be/licenses",
      `medusa-plugin-content-${contentPluginVersion}.LICENSE`,
    )
    const license = await readFile(licensePath)
    expect(sha256(license)).toBe(contentPluginLicenseSha256)
    expect(license.toString("utf-8")).toContain("## Sustainable Use License")

    const dockerfile = await readFile(
      path.join(repoRoot, "docker/development/medusa-be/Dockerfile"),
      "utf-8",
    )
    expect(dockerfile).toContain(
      "COPY --from=build --chown=node:node /var/www/apps/medusa-be/licenses ./licenses",
    )
  })
})
