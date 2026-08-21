import { describe, expect, it } from "vitest"
import type {
  AboutPageData,
  AboutParagraph,
  AboutTextPart,
} from "./about-page.data"
import { getAboutPageData } from "./about-page.data"

const SLOVAK_COMMERCE_CANARY = /ahoj@|lenka@|herbatica\.sk|\+421|00421|\bEUR\b/i
const SLOVAK_VISIBLE_COPY_CANARY =
  /O našom|Kľúčové míľniky|Začiatky značky|Náš tím|Prevádzkovateľ|Sme tu pre vás/i
const FOREIGN_CONTACT_AUTHORITY_CANARY =
  /ahoj@|lenka@|salut@|herbatica\.(?:sk|ro)|\+421|00421|\+40|Herbatica s\.r\.o\.|IČO|DIČ|IČ DPH|CUI|TVA|Turzovka-Stred|Piešťany|Trenčín/i

const paragraphStrings = (paragraph: AboutParagraph): string[] =>
  typeof paragraph === "string"
    ? [paragraph]
    : paragraph.map((part: AboutTextPart) =>
        typeof part === "string" ? part : part.label
      )

const visibleStrings = (data: AboutPageData): string[] => [
  data.hero.title,
  ...paragraphStrings(data.hero.lead),
  ...data.sections.flatMap((section) => [
    section.title,
    ...section.paragraphs.flatMap(paragraphStrings),
    ...(section.image
      ? [
          section.image.alt,
          ...(section.image.caption ? [section.image.caption] : []),
        ]
      : []),
  ]),
  ...data.logoMeaning.paragraphs.flatMap(paragraphStrings),
  data.milestonesTitle,
  ...data.milestones.flatMap((milestone) => [
    milestone.year,
    ...paragraphStrings(milestone.description),
  ]),
  data.closingStatement,
  ...data.principles.flatMap((principle) => [
    principle.title,
    principle.description,
  ]),
  ...data.follow.paragraphs.flatMap(paragraphStrings),
  ...data.socialLinks.map((link) => link.label),
  ...data.loyalty.paragraphs.flatMap(paragraphStrings),
  data.reviews.title,
  ...data.reviews.paragraphs.flatMap(paragraphStrings),
  data.contact.title,
  data.contact.operatorTitle,
  ...data.contact.paragraphs.flatMap(paragraphStrings),
  ...data.contact.companyDetails,
]

describe("localized About page data", () => {
  it("preserves the existing Slovak page", () => {
    const slovak = getAboutPageData("sk-SK")

    expect(slovak?.hero.title).toBe("O našom tíme")
    expect(slovak?.milestonesTitle).toBe("Kľúčové míľniky našej histórie")
    expect(slovak?.sections).toHaveLength(5)
    expect(slovak?.milestones).toHaveLength(6)
    expect(slovak?.contact.companyDetails).toContain("Slovensko")
  })

  it("provides complete Romanian structural parity", () => {
    const slovak = getAboutPageData("sk-SK")
    const romanian = getAboutPageData("ro-RO")

    expect(romanian).not.toBeNull()
    expect(
      romanian?.sections.map(({ paragraphs }) => paragraphs.length)
    ).toEqual(slovak?.sections.map(({ paragraphs }) => paragraphs.length))
    expect(romanian?.sections.map(({ image }) => Boolean(image))).toEqual(
      slovak?.sections.map(({ image }) => Boolean(image))
    )
    expect(romanian?.milestones.map(({ year }) => year)).toEqual(
      slovak?.milestones.map(({ year }) => year)
    )
    expect(romanian?.principles).toHaveLength(slovak?.principles.length ?? 0)
    expect(visibleStrings(romanian as AboutPageData).every(Boolean)).toBe(true)
  })

  it("contains Romanian contact canaries without Slovak commerce leakage", () => {
    const romanian = getAboutPageData("ro-RO")
    const copy = visibleStrings(romanian as AboutPageData).join("\n")

    expect(copy).toContain("Despre echipa noastră")
    expect(copy).toContain("Momente importante din istoria noastră")
    expect(copy).toContain("salut@herbatica.ro")
    expect(copy).toContain("+40 (31) 2295431")
    expect(copy).not.toMatch(SLOVAK_COMMERCE_CANARY)
    expect(copy).not.toMatch(SLOVAK_VISIBLE_COPY_CANARY)
  })

  it.each([
    ["cs-CZ", "O našem týmu", "Důležité milníky naší historie"],
    ["hu-HU", "Csapatunkról", "Történetünk fontos mérföldkövei"],
  ] as const)("provides complete %s structural parity", (locale, expectedTitle, expectedMilestonesTitle) => {
    const slovak = getAboutPageData("sk-SK")
    const localized = getAboutPageData(locale)

    expect(localized).not.toBeNull()
    expect(localized?.hero.title).toBe(expectedTitle)
    expect(localized?.milestonesTitle).toBe(expectedMilestonesTitle)
    expect(
      localized?.sections.map(({ paragraphs }) => paragraphs.length)
    ).toEqual(slovak?.sections.map(({ paragraphs }) => paragraphs.length))
    expect(localized?.sections.map(({ image }) => Boolean(image))).toEqual(
      slovak?.sections.map(({ image }) => Boolean(image))
    )
    expect(localized?.milestones.map(({ year }) => year)).toEqual(
      slovak?.milestones.map(({ year }) => year)
    )
    expect(localized?.principles).toHaveLength(slovak?.principles.length ?? 0)
    expect(visibleStrings(localized as AboutPageData).every(Boolean)).toBe(true)
  })

  it.each([
    [
      "cs-CZ",
      "Kontakt pro český trh",
      "Zákaznická podpora Herbatica pro Českou republiku",
    ],
    [
      "hu-HU",
      "Kapcsolat a magyar piachoz",
      "Herbatica ügyfélszolgálat Magyarország számára",
    ],
  ] as const)("keeps %s contact authority market-neutral and free of foreign operator data", (locale, operatorTitle, marketCanary) => {
    const localized = getAboutPageData(locale)
    const contact = localized?.contact
    const contactCopy = [
      contact?.title,
      contact?.operatorTitle,
      ...(contact?.paragraphs.flatMap(paragraphStrings) ?? []),
      ...(contact?.companyDetails ?? []),
    ].join("\n")

    expect(contact?.operatorTitle).toBe(operatorTitle)
    expect(contactCopy).toContain(marketCanary)
    expect(JSON.stringify(contact)).not.toMatch(
      FOREIGN_CONTACT_AUTHORITY_CANARY
    )
  })

  it("has approved content for every supported storefront locale", () => {
    for (const locale of ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const) {
      expect(getAboutPageData(locale)).not.toBeNull()
    }
  })
})
