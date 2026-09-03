"use client"

import { useTranslations } from "next-intl"

export type OperatorSocialLink = Readonly<{
  href: string
  platform: "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube"
}>

const SOCIAL_PLATFORMS = new Set<OperatorSocialLink["platform"]>([
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
])

const parseSocialLinks = (value: string): readonly OperatorSocialLink[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return []
    }
    const links: OperatorSocialLink[] = []
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== "object" ||
        !("href" in item) ||
        !("platform" in item) ||
        typeof item.href !== "string" ||
        typeof item.platform !== "string" ||
        !SOCIAL_PLATFORMS.has(item.platform as OperatorSocialLink["platform"])
      ) {
        return []
      }
      links.push({
        href: item.href,
        platform: item.platform as OperatorSocialLink["platform"],
      })
    }
    return links
  } catch {
    return []
  }
}

export const useOperatorContact = () => {
  const t = useTranslations("navigation.contact")
  const available = t("authority_status") === "available"

  return {
    available,
    authoritySource: t("authority_source"),
    emailDisplay: available ? t("email_display") : "",
    emailHref: available ? t("email_href") : "",
    hours: available ? t("hours") : "",
    phoneDisplay: available ? t("phone_display") : "",
    phoneHref: available ? t("phone_href") : "",
    socialLinks: available ? parseSocialLinks(t("social_links")) : [],
    unavailable: t("unavailable"),
  } as const
}
