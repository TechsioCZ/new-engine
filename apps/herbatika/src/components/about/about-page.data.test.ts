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

  it("fails closed for locales without approved content", () => {
    expect(getAboutPageData("cs-CZ")).toBeNull()
    expect(getAboutPageData("hu-HU")).toBeNull()
  })
})
