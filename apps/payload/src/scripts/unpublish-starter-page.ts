import { getPayload } from "payload"
import config from "../payload.config"

/**
 * Flip the English dev-starter "About Herbatica" page to a non-public state
 * so it is never served or indexed on the storefront.
 *
 * The starter page's slug is localized (sk=about-herbatica, cs=o-herbatice,
 * hu=a-herbatica-bemutatasa, ro=despre-herbatica), and a locale-default
 * `find` by slug can match a different document than the one actually served
 * per locale. Search every locale's slug column so the real document is
 * always caught, then flip each match via the same overrideAccess update
 * style seed.ts uses. Idempotent: already-draft documents are skipped.
 */
const STARTER_SLUGS = [
  "about-herbatica",
  "o-herbatice",
  "a-herbatica-bemutatasa",
  "despre-herbatica",
] as const

const LOCALES = ["sk", "cs", "hu", "ro"] as const

const run = async () => {
  const payload = await getPayload({ config })

  try {
    const ids = new Set<number | string>()
    for (const locale of LOCALES) {
      const result = await payload.find({
        collection: "pages",
        where: { slug: { in: [...STARTER_SLUGS] } },
        depth: 0,
        limit: 20,
        locale,
        pagination: false,
        overrideAccess: true,
      })
      for (const doc of result.docs) {
        ids.add(doc.id)
      }
    }

    if (ids.size === 0) {
      payload.logger.warn("No starter page documents found")
      return
    }

    for (const id of ids) {
      const doc = await payload.findByID({
        collection: "pages",
        id,
        depth: 0,
        overrideAccess: true,
      })
      if (doc.status === "draft" && doc.visibility === "customers-only") {
        payload.logger.info(`Skipping id=${id}: already non-public`)
        continue
      }
      payload.logger.info(
        `Unpublishing pages id=${id} (was status=${doc.status}, visibility=${doc.visibility})`
      )
      await payload.update({
        collection: "pages",
        id,
        data: {
          status: "draft",
          visibility: "customers-only",
        },
        overrideAccess: true,
      })
    }
  } finally {
    await payload.destroy()
  }
}

await run()
