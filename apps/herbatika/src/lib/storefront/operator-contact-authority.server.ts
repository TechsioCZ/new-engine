// Pages Router server boundary. This module prevents unreviewed phone, email,
// and social identifiers from crossing into next-intl client messages.

import type { FlatStorefrontMessages } from "@techsio/storefront-i18n/core/messages"
import type { Market } from "@/lib/url/types"
import {
  OPERATOR_CONTACT_REVIEWED_AUTHORITIES_ENV as AUTHORITY_ENV,
  parseOperatorContactAuthorityEnv,
} from "./operator-contact-authority-env.server"
import {
  type OperatorContact,
  parseOperatorContact,
} from "./operator-contact-payload.server"
import { resolveReviewedOperatorContact } from "./operator-contact-reviewed-artifacts.server"

const CONTACT_KEYS = {
  authoritySource: "navigation.contact.authority_source",
  emailDisplay: "navigation.contact.email_display",
  emailHref: "navigation.contact.email_href",
  hours: "navigation.contact.hours",
  phoneDisplay: "navigation.contact.phone_display",
  phoneHref: "navigation.contact.phone_href",
  socialLinks: "navigation.contact.social_links",
  status: "navigation.contact.authority_status",
  unavailable: "navigation.contact.unavailable",
} as const

const UNAVAILABLE_MESSAGE = {
  cz: "Kontaktní údaje nejsou momentálně dostupné.",
  hu: "Az elérhetőségek jelenleg nem állnak rendelkezésre.",
  ro: "Datele de contact nu sunt disponibile momentan.",
  sk: "Kontaktné údaje momentálne nie sú dostupné.",
} as const satisfies Record<Market, string>

const resolveSkMessageContact = (
  messages: FlatStorefrontMessages
): OperatorContact =>
  parseOperatorContact(
    {
      emailDisplay: messages[CONTACT_KEYS.emailDisplay],
      emailHref: messages[CONTACT_KEYS.emailHref],
      hours: messages[CONTACT_KEYS.hours],
      phoneDisplay: messages[CONTACT_KEYS.phoneDisplay],
      phoneHref: messages[CONTACT_KEYS.phoneHref],
      socialLinks: [],
    },
    "SK storefront contact"
  )

const unavailableMessages = (
  market: Market,
  messages: FlatStorefrontMessages
): FlatStorefrontMessages => ({
  ...messages,
  [CONTACT_KEYS.authoritySource]: "unavailable",
  [CONTACT_KEYS.emailDisplay]: "",
  [CONTACT_KEYS.emailHref]: "",
  [CONTACT_KEYS.hours]: "",
  [CONTACT_KEYS.phoneDisplay]: "",
  [CONTACT_KEYS.phoneHref]: "",
  [CONTACT_KEYS.socialLinks]: "[]",
  [CONTACT_KEYS.status]: "unavailable",
  [CONTACT_KEYS.unavailable]: UNAVAILABLE_MESSAGE[market],
})

type ResolvedContactAuthority = Readonly<{
  contact: OperatorContact
  source: "reviewed" | "sk-existing"
}>

const resolveContactAuthority = (
  market: Market,
  messages: FlatStorefrontMessages,
  authorityEnv: string | undefined
): ResolvedContactAuthority | null => {
  if (!authorityEnv) {
    return market === "sk"
      ? { contact: resolveSkMessageContact(messages), source: "sk-existing" }
      : null
  }
  const files = parseOperatorContactAuthorityEnv(authorityEnv).find(
    (candidate) => candidate.market === market
  )
  if (files) {
    return {
      contact: resolveReviewedOperatorContact(files),
      source: "reviewed",
    }
  }
  return market === "sk"
    ? { contact: resolveSkMessageContact(messages), source: "sk-existing" }
    : null
}

export const applyOperatorContactAuthority = (
  market: Market,
  messages: FlatStorefrontMessages,
  authorityEnv = process.env[AUTHORITY_ENV]
): FlatStorefrontMessages => {
  let resolved: ResolvedContactAuthority | null
  try {
    resolved = resolveContactAuthority(market, messages, authorityEnv)
  } catch {
    if (market !== "sk") {
      return unavailableMessages(market, messages)
    }
    try {
      resolved = {
        contact: resolveSkMessageContact(messages),
        source: "sk-existing",
      }
    } catch {
      return unavailableMessages(market, messages)
    }
  }
  if (!resolved) {
    return unavailableMessages(market, messages)
  }
  return {
    ...messages,
    [CONTACT_KEYS.authoritySource]: resolved.source,
    [CONTACT_KEYS.emailDisplay]: resolved.contact.emailDisplay,
    [CONTACT_KEYS.emailHref]: resolved.contact.emailHref,
    [CONTACT_KEYS.hours]: resolved.contact.hours,
    [CONTACT_KEYS.phoneDisplay]: resolved.contact.phoneDisplay,
    [CONTACT_KEYS.phoneHref]: resolved.contact.phoneHref,
    [CONTACT_KEYS.socialLinks]: JSON.stringify(resolved.contact.socialLinks),
    [CONTACT_KEYS.status]: "available",
    [CONTACT_KEYS.unavailable]: UNAVAILABLE_MESSAGE[market],
  }
}
