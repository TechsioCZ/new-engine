import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  resolveFooterNavigationItem,
  resolveFooterSocialLinks,
} from "./herbatika-footer"
import { resolveFooterMarketLinks } from "./herbatika-footer.market-links"

const footerSource = readFileSync(
  resolve(process.cwd(), "src/components/herbatika-footer.tsx"),
  "utf8"
)
const appShellSource = readFileSync(
  resolve(process.cwd(), "src/components/app-shell.tsx"),
  "utf8"
)
const pagesAppSource = readFileSync(
  resolve(process.cwd(), "src/pages/_app.tsx"),
  "utf8"
)

describe("HerbatikaFooter contact localization", () => {
  it("renders every contact value through the active navigation messages", () => {
    expect(footerSource).toContain('href={t("contact.phone_href")}')
    expect(footerSource).toContain('{t("contact.phone_display")}')
    expect(footerSource).toContain('{t("contact.hours")}')
    expect(footerSource).toContain('href={t("contact.email_href")}')
    expect(footerSource).toContain('{t("contact.email_display")}')
  })

  it("does not embed a market-specific phone, schedule, or email", () => {
    expect(footerSource).not.toContain("tel:+421")
    expect(footerSource).not.toContain("+421 2/321")
    expect(footerSource).not.toContain("Po-Pia")
    expect(footerSource).not.toContain("mailto:ahoj@herbatica.sk")
  })
})

describe("HerbatikaFooter market links", () => {
  const configuredAlternates = {
    "ro-RO": "https://ro.shop.example/produse/ceai-verde",
    "sk-SK": "https://sk.shop.example/produkty/zeleny-caj",
  }

  it("marks SK active and links to the configured Romanian equivalent", () => {
    expect(resolveFooterMarketLinks("sk", configuredAlternates)).toEqual([
      {
        active: true,
        code: "SK",
        href: "https://sk.shop.example/produkty/zeleny-caj",
        icon: "token-icon-sk",
        market: "sk",
      },
      {
        active: false,
        code: "RO",
        href: "https://ro.shop.example/produse/ceai-verde",
        icon: "token-icon-ro",
        market: "ro",
      },
    ])
  })

  it("marks RO active and links back to the configured Slovak equivalent", () => {
    expect(resolveFooterMarketLinks("ro", configuredAlternates)).toEqual([
      {
        active: false,
        code: "SK",
        href: "https://sk.shop.example/produkty/zeleny-caj",
        icon: "token-icon-sk",
        market: "sk",
      },
      {
        active: true,
        code: "RO",
        href: "https://ro.shop.example/produse/ceai-verde",
        icon: "token-icon-ro",
        market: "ro",
      },
    ])
  })

  it("omits unavailable or unsafe markets instead of guessing a domain", () => {
    expect(
      resolveFooterMarketLinks("sk", {
        "cs-CZ": "https://user:secret@cz.shop.example/",
        "ro-RO": "http://ro.shop.example/produse",
        "sk-SK": "https://sk.shop.example/#untrusted-fragment",
      })
    ).toEqual([])
  })

  it("renders navigable link buttons from the trusted market links", () => {
    expect(pagesAppSource).toContain(
      "marketAlternates={pageProps.seo?.alternates}"
    )
    expect(appShellSource).toContain("marketAlternates={marketAlternates}")
    expect(footerSource).toContain("resolveFooterMarketLinks(")
    expect(footerSource).toContain("<LinkButton")
    expect(footerSource).toContain("href={link.href}")
    expect(footerSource).toContain(
      'aria-current={link.active ? "page" : undefined}'
    )
  })
})

describe("HerbatikaFooter social links", () => {
  it("preserves generic profiles and Slovak-specific profiles on SK", () => {
    expect(resolveFooterSocialLinks("sk").map((link) => link.label)).toEqual([
      "Facebook",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "TikTok",
    ])
  })

  it("keeps generic profiles but hides Slovak LinkedIn and TikTok on RO", () => {
    const links = resolveFooterSocialLinks("ro")

    expect(links.map((link) => link.label)).toEqual([
      "Facebook",
      "Instagram",
      "YouTube",
    ])
    expect(links.map((link) => link.href)).not.toContain(
      "https://www.linkedin.com/company/herbaticask/"
    )
    expect(links.map((link) => link.href)).not.toContain(
      "https://www.tiktok.com/@herbatica.sk"
    )
  })

  it("renders social destinations as links instead of window actions", () => {
    expect(footerSource).toContain("resolveFooterSocialLinks(")
    expect(footerSource).toContain("href={social.href}")
    expect(footerSource).not.toContain("window.open(social.href")
  })
})

describe("resolveFooterNavigationItem", () => {
  it("accepts a valid internal path for the active market", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/informacie/about-herbatica",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({
      href: "/informacie/about-herbatica",
      kind: "internal",
    })
  })

  it("supports application routes independently of their translation slot", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/kategorie/darceky",
          slot: "gift_voucher",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({ href: "/kategorie/darceky", kind: "internal" })
  })

  it("fails closed for an unknown internal route", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/legacy-or-editor-authored-path",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toBeNull()
  })

  it.each([
    "javascript:alert(1)",
    "//example.com/reviews",
    "https://user:secret@example.com/reviews",
  ])("rejects unsafe external CMS href %s", (href) => {
    expect(
      resolveFooterNavigationItem(
        {
          href,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toBeNull()
  })

  it("accepts an explicit HTTP(S) external URL and preserves tab intent", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "https://example.com/reviews",
          newTab: false,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toEqual({
      href: "https://example.com/reviews",
      kind: "external",
      newTab: false,
    })
  })
})
