import { getPayload } from "payload"
import config from "../payload.config"

/**
 * One-off fix: Payload `pages` id=12 (FAQ) `sk` and `cs` locales still link
 * their "how to become a club member" account-register CTA at a stale,
 * pre-engine href:
 *   - sk: link fields.url = "/registracia/" (bare legacy path, 404s on this
 *     engine's /ucet/... route prefix)
 *   - cs: link fields.url = "/registrace/" (bare legacy path; the visible
 *     anchor TEXT for this one link is the full external
 *     "https://www.herbatica.cz/registrace/", even though the stored href
 *     itself is relative — verified via inspecting the raw lexical JSON)
 *
 * This mirrors exactly what apps/payload/src/scripts/localize-faq-ro.ts
 * already documented and fixed for `ro` (canonical `/cont/inregistrare`).
 * The canonical account/register path for each market comes from
 * PUBLIC_FLOW_ROUTE_SEGMENTS in
 * libs/storefront-i18n/src/core/public-flow-routes.ts:
 * `/${flowRoots.account}/${children.account.register}`
 *   - sk: flowRoots.account="ucet", children.account.register="registracia"
 *     -> "/ucet/registracia" (verified live: HTTP 200 via
 *     `curl -H 'Host: localhost' http://127.0.0.1:3001/ucet/registracia`)
 *   - cs: flowRoots.account="ucet", children.account.register="registrace"
 *     -> "/ucet/registrace" (verified live: HTTP 200 via
 *     `curl -H 'Host: cz.localhost' http://127.0.0.1:3001/ucet/registrace`)
 *
 * IMPORTANT disambiguation (cs only): the cs content has a SECOND, unrelated
 * link node whose fields.url is also the bare "/registrace/" — it lives
 * under the "Velkoobchod" (wholesale) heading, has anchor text
 * "Zaregistrujte se zde »", and opens in a new tab (newTab: true). That is a
 * B2B wholesale-partner registration CTA, a different feature entirely from
 * the customer account-register flow modeled by PUBLIC_FLOW_ROUTE_SEGMENTS,
 * and is NOT the link this fix targets. To avoid mis-rewriting it, a match
 * additionally requires the link's own visible anchor text to itself be the
 * stale absolute herbatica.<tld>/registr... URL (the "- stačí kliknúť/
 * kliknout na: <link>" pattern used by both the sk and cs target links, and
 * absent from the wholesale CTA). Only fields.url is rewritten — the
 * (already-stale) visible anchor text is left as-is, matching the
 * instruction to touch nothing but the matched link's href.
 *
 * Every other node (heading/paragraph/list/other links) is left completely
 * untouched; only the `content` field is written, and only for the locale
 * that actually changed.
 *
 * Idempotent: once fields.url is rewritten to the canonical path it no
 * longer matches the stale-href pattern, so re-running finds 0 nodes to
 * change for that locale.
 *
 * Run (dry-run, default): payload run src/scripts/fix-faq-register-links.ts
 * Run (apply):      FAQ_REGISTER_LINKS_APPLY=1 payload run src/scripts/fix-faq-register-links.ts
 */

const PAGE_ID = 12

type LinkNode = {
  type: "link"
  fields: { url?: unknown; linkType?: unknown; newTab?: unknown }
  children?: unknown[]
}

type LocaleFix = {
  locale: "sk" | "cs"
  domain: string
  stalePath: string
  canonicalPath: string
}

const LOCALE_FIXES: readonly LocaleFix[] = [
  {
    locale: "sk",
    domain: "herbatica.sk",
    stalePath: "/registracia",
    canonicalPath: "/ucet/registracia",
  },
  {
    locale: "cs",
    domain: "herbatica.cz",
    stalePath: "/registrace",
    canonicalPath: "/ucet/registrace",
  },
]

// Strips an optional http(s)://(www.)<domain> prefix and any trailing
// slash, so "/registracia/", "/registracia", "https://www.herbatica.sk/registracia/"
// and "http://herbatica.sk/registracia" all normalize to "/registracia".
const DOMAIN_DOT_PATTERN = /\./g
const TRAILING_SLASHES_PATTERN = /\/+$/

const normalizePath = (rawUrl: string, domain: string): string => {
  const domainEscaped = domain.replace(DOMAIN_DOT_PATTERN, "\\.")
  const withoutOrigin = rawUrl.replace(
    new RegExp(`^https?://(www\\.)?${domainEscaped}`, "i"),
    ""
  )
  return withoutOrigin.replace(TRAILING_SLASHES_PATTERN, "") || "/"
}

const isStaleHref = (rawUrl: unknown, fix: LocaleFix): rawUrl is string =>
  typeof rawUrl === "string" &&
  normalizePath(rawUrl, fix.domain) === fix.stalePath

// The wholesale-registration CTA on the cs locale shares the same bare
// "/registrace/" href but has unrelated anchor text ("Zaregistrujte se zde
// »"). Only rewrite a link whose own visible label repeats the stale
// absolute herbatica.<tld>/registr... URL, which is the pattern unique to
// the two target account-register links (sk and cs).
const getLinkLabelText = (node: LinkNode): string =>
  (node.children ?? [])
    .map((child) =>
      child &&
      typeof child === "object" &&
      "text" in (child as Record<string, unknown>)
        ? String((child as Record<string, unknown>).text ?? "")
        : ""
    )
    .join("")

const hasStaleLabel = (node: LinkNode, fix: LocaleFix): boolean =>
  isStaleHref(getLinkLabelText(node), fix)

const isLinkNode = (node: unknown): node is LinkNode =>
  typeof node === "object" &&
  node !== null &&
  (node as Record<string, unknown>).type === "link" &&
  typeof (node as Record<string, unknown>).fields === "object"

// Mutates matching link nodes in place; returns the number changed.
const fixLinksInTree = (node: unknown, fix: LocaleFix): number => {
  if (!node || typeof node !== "object") {
    return 0
  }

  let changed = 0
  const record = node as Record<string, unknown>

  if (isLinkNode(node)) {
    const fields = node.fields as Record<string, unknown>
    if (isStaleHref(fields.url, fix) && hasStaleLabel(node, fix)) {
      fields.url = fix.canonicalPath
      changed += 1
    }
  }

  for (const key of Object.keys(record)) {
    const value = record[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        changed += fixLinksInTree(item, fix)
      }
    } else if (value && typeof value === "object") {
      changed += fixLinksInTree(value, fix)
    }
  }

  return changed
}

const run = async () => {
  const apply = process.env.FAQ_REGISTER_LINKS_APPLY === "1"
  const payload = await getPayload({ config })

  try {
    const summary: Record<string, number> = {}

    for (const fix of LOCALE_FIXES) {
      const existing = await payload.findByID({
        collection: "pages",
        id: PAGE_ID,
        depth: 0,
        fallbackLocale: false,
        locale: fix.locale,
        overrideAccess: true,
      })

      const content = existing.content
      if (!content?.root) {
        payload.logger.info(
          `pages id=${PAGE_ID} locale=${fix.locale}: no content.root found — skipping`
        )
        summary[fix.locale] = 0
        continue
      }

      const changedCount = fixLinksInTree(content.root, fix)
      summary[fix.locale] = changedCount

      if (changedCount === 0) {
        payload.logger.info(
          `pages id=${PAGE_ID} locale=${fix.locale}: 0 stale register links found (nothing to change)`
        )
        continue
      }

      if (!apply) {
        payload.logger.info(
          `DRY RUN (set FAQ_REGISTER_LINKS_APPLY=1 to apply): pages id=${PAGE_ID} locale=${fix.locale} would rewrite ${changedCount} link node(s) fields.url -> "${fix.canonicalPath}"`
        )
        continue
      }

      await payload.update({
        id: PAGE_ID,
        collection: "pages",
        data: { content },
        locale: fix.locale,
        overrideAccess: true,
      })
      payload.logger.info(
        `Applied: pages id=${PAGE_ID} locale=${fix.locale} rewrote ${changedCount} link node(s) fields.url -> "${fix.canonicalPath}"`
      )
    }

    payload.logger.info(
      `Summary (nodes changed per locale): ${JSON.stringify(summary)}`
    )
  } finally {
    await payload.destroy()
  }
}

await run()
