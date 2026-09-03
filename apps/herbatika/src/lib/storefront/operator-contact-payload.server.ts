import { createHash } from "node:crypto"
import type { Market } from "@/lib/url/types"
import {
  assertStaticContentExactKeys,
  canonicalStaticContentJson,
  parseStaticContentJson,
  staticContentRecord,
  staticContentText,
} from "../../../scripts/market-static-content/primitives"
import { STATIC_CONTENT_LOCALE_BY_MARKET } from "../../../scripts/market-static-content/types"

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_HREF = /^tel:\+[0-9() /-]+$/

export type OperatorSocialLink = Readonly<{
  href: string
  platform: "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube"
}>

export type OperatorContact = Readonly<{
  emailDisplay: string
  emailHref: string
  hours: string
  phoneDisplay: string
  phoneHref: string
  socialLinks: readonly OperatorSocialLink[]
}>

const SOCIAL_HOST_BY_PLATFORM = {
  facebook: "facebook.com",
  instagram: "instagram.com",
  linkedin: "linkedin.com",
  tiktok: "tiktok.com",
  youtube: "youtube.com",
} as const satisfies Record<OperatorSocialLink["platform"], string>

export const operatorContactSha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex")

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })

const parseMailto = (href: string, display: string): boolean => {
  if (!href.startsWith("mailto:") || href.includes("?") || href.includes("#")) {
    return false
  }
  const address = href.slice("mailto:".length)
  return (
    address.toLocaleLowerCase("en") === display.toLocaleLowerCase("en") &&
    EMAIL_ADDRESS.test(address)
  )
}

const parseSocialLinks = (
  value: unknown,
  label: string
): readonly OperatorSocialLink[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const platforms = new Set<OperatorSocialLink["platform"]>()
  return value.map((item, index) => {
    const itemLabel = `${label}[${index}]`
    const link = staticContentRecord(item, itemLabel)
    assertStaticContentExactKeys(link, ["href", "platform"], itemLabel)
    if (
      typeof link.platform !== "string" ||
      !Object.hasOwn(SOCIAL_HOST_BY_PLATFORM, link.platform)
    ) {
      throw new Error(`${itemLabel}.platform is invalid`)
    }
    const platform = link.platform as OperatorSocialLink["platform"]
    if (platforms.has(platform)) {
      throw new Error(`${label} contains duplicate platforms`)
    }
    platforms.add(platform)
    const href = staticContentText(link.href, `${itemLabel}.href`)
    let url: URL
    try {
      url = new URL(href)
    } catch {
      throw new Error(`${itemLabel}.href is invalid`)
    }
    const expectedHost = SOCIAL_HOST_BY_PLATFORM[platform]
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !(
        url.hostname === expectedHost ||
        url.hostname === `www.${expectedHost}` ||
        (platform === "youtube" && url.hostname === "youtu.be")
      )
    ) {
      throw new Error(`${itemLabel}.href is not a valid ${platform} profile`)
    }
    return { href, platform }
  })
}

export const parseOperatorContact = (
  value: unknown,
  label: string
): OperatorContact => {
  const contact = staticContentRecord(value, label)
  assertStaticContentExactKeys(
    contact,
    [
      "emailDisplay",
      "emailHref",
      "hours",
      "phoneDisplay",
      "phoneHref",
      "socialLinks",
    ],
    label
  )
  const parsed = {
    emailDisplay: staticContentText(
      contact.emailDisplay,
      `${label}.emailDisplay`
    ),
    emailHref: staticContentText(contact.emailHref, `${label}.emailHref`),
    hours: staticContentText(contact.hours, `${label}.hours`),
    phoneDisplay: staticContentText(
      contact.phoneDisplay,
      `${label}.phoneDisplay`
    ),
    phoneHref: staticContentText(contact.phoneHref, `${label}.phoneHref`),
    socialLinks: parseSocialLinks(contact.socialLinks, `${label}.socialLinks`),
  }
  if (
    !(
      parseMailto(parsed.emailHref, parsed.emailDisplay) &&
      PHONE_HREF.test(parsed.phoneHref)
    ) ||
    [
      parsed.emailDisplay,
      parsed.emailHref,
      parsed.hours,
      parsed.phoneDisplay,
      parsed.phoneHref,
    ].some((text) => text.length > 160 || containsControlCharacter(text))
  ) {
    throw new Error(`${label} contains an invalid contact value`)
  }
  return parsed
}

export const parseReviewedOperatorContactPayload = (
  contents: string,
  expected: Readonly<{ entryId: string; market: Market }>
): OperatorContact => {
  const raw = parseStaticContentJson(
    contents,
    "operator contact reviewed payload"
  )
  if (canonicalStaticContentJson(raw) !== contents) {
    throw new Error(
      "operator contact reviewed payload is not canonical JSON with a trailing newline"
    )
  }
  const payload = staticContentRecord(raw, "operator contact reviewed payload")
  assertStaticContentExactKeys(
    payload,
    ["contact", "entryId", "kind", "locale", "market", "schemaVersion"],
    "operator contact reviewed payload"
  )
  if (
    payload.schemaVersion !== 1 ||
    payload.kind !== "market-operator-contact-reviewed-payload" ||
    payload.market !== expected.market ||
    payload.locale !== STATIC_CONTENT_LOCALE_BY_MARKET[expected.market] ||
    payload.entryId !== expected.entryId
  ) {
    throw new Error("operator contact reviewed payload identity is invalid")
  }
  return parseOperatorContact(
    payload.contact,
    "operator contact reviewed payload.contact"
  )
}
