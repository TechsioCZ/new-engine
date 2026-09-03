import { describe, expect, it } from "vitest"
import type { FaqAnswerBlock, FaqItem } from "./faq-page.data"
import { faqItemCount, faqItems, getFaqPageData } from "./faq-page.data"

const SLOVAK_COMMERCE_CANARY =
  /ahoj@|lenka@|herbatica\.sk|\+421|00421|49\s*€|\bEUR\b/i
const SLOVAK_VISIBLE_COPY_CANARY =
  /Vaša|objednávka|tovar|zľav|Prihláste|prehľad|stiahnutie|reklamáci|predajň|kúpnej/i
const FOREIGN_CONTACT_AUTHORITY_CANARY =
  /ahoj@|lenka@|salut@|herbatica\.(?:sk|ro)|\+421|00421|\+40|49\s*€|\bEUR\b|\bRON\b|Herbatica s\.r\.o\.|Turzovka-Stred|Piešťany|Trenčín/i
const HUF_CANARY = /\bHUF\b/i
const CZK_CANARY = /\bCZK\b/i

const visibleStrings = (items: FaqItem[]) =>
  items.flatMap((item) => [
    item.question,
    ...item.answer.flatMap((block: FaqAnswerBlock) => {
      if (block.type === "list") {
        return block.items
      }
      if (block.type === "links") {
        return block.items.map((link) => link.label)
      }
      return [block.text]
    }),
  ])

describe("localized FAQ data", () => {
  it("preserves the Slovak FAQ contract and exact existing page copy", () => {
    const slovak = getFaqPageData("sk-SK")

    expect(slovak).not.toBeNull()
    expect(slovak?.title).toBe("Často kladené otázky")
    expect(slovak?.intro).toBe("Prehľad odpovedí z pôvodného Herbatica FAQ.")
    expect(slovak?.items).toBe(faqItems)
    expect(slovak?.items).toHaveLength(faqItemCount)
  })

  it("provides full Romanian item and answer-block parity", () => {
    const slovak = getFaqPageData("sk-SK")
    const romanian = getFaqPageData("ro-RO")

    expect(romanian).not.toBeNull()
    expect(romanian?.title).toBe("Întrebări frecvente")
    expect(romanian?.items.map((item) => item.id)).toEqual(
      slovak?.items.map((item) => item.id)
    )
    expect(
      romanian?.items.map((item) => item.answer.map(({ type }) => type))
    ).toEqual(slovak?.items.map((item) => item.answer.map(({ type }) => type)))
    expect(
      romanian?.items.every(
        (item) =>
          item.question.trim().length > 0 &&
          item.answer.every((block) =>
            block.type === "list" || block.type === "links"
              ? block.items.length > 0
              : block.text.trim().length > 0
          )
      )
    ).toBe(true)

    const slovakVisibleStrings = new Set(visibleStrings(slovak?.items ?? []))
    const copiedVisibleStrings = visibleStrings(romanian?.items ?? []).filter(
      (value) => slovakVisibleStrings.has(value)
    )
    expect(copiedVisibleStrings).toEqual([
      "Newsletter",
      "Instagram",
      "Facebook",
      "Dognet",
    ])
  })

  it("contains Romanian contacts and RON wording without Slovak or EUR canaries", () => {
    const romanian = getFaqPageData("ro-RO")
    const renderedCopy = visibleStrings(romanian?.items ?? []).join("\n")
    const serialized = JSON.stringify(romanian)

    expect(renderedCopy).toContain("salut@herbatica.ro")
    expect(renderedCopy).toContain("+40 (31) 2295431")
    expect(renderedCopy).toContain("RON")
    expect(serialized).not.toMatch(SLOVAK_COMMERCE_CANARY)
    expect(renderedCopy).not.toMatch(SLOVAK_VISIBLE_COPY_CANARY)
  })

  it.each([
    ["cs-CZ", "Často kladené otázky", "CZK"],
    ["hu-HU", "Gyakran ismételt kérdések", "HUF"],
  ] as const)("provides full %s item and answer-block parity", (locale, expectedTitle, currency) => {
    const slovak = getFaqPageData("sk-SK")
    const localized = getFaqPageData(locale)

    expect(localized).not.toBeNull()
    expect(localized?.title).toBe(expectedTitle)
    expect(localized?.items.map((item) => item.id)).toEqual(
      slovak?.items.map((item) => item.id)
    )
    expect(
      localized?.items.map((item) => item.answer.map(({ type }) => type))
    ).toEqual(slovak?.items.map((item) => item.answer.map(({ type }) => type)))
    expect(
      localized?.items.every(
        (item) =>
          item.question.trim().length > 0 &&
          item.answer.every((block) =>
            block.type === "list" || block.type === "links"
              ? block.items.length > 0
              : block.text.trim().length > 0
          )
      )
    ).toBe(true)
    expect(visibleStrings(localized?.items ?? []).join("\n")).toContain(
      currency
    )
  })

  it.each([
    ["cs-CZ", HUF_CANARY],
    ["hu-HU", CZK_CANARY],
  ] as const)("keeps %s FAQ free of foreign contacts, operator claims, and currency leakage", (locale, otherMarketCurrency) => {
    const localized = getFaqPageData(locale)
    const serialized = JSON.stringify(localized)

    expect(serialized).not.toMatch(FOREIGN_CONTACT_AUTHORITY_CANARY)
    expect(serialized).not.toMatch(otherMarketCurrency)
    expect(serialized).toContain('"page":"contact"')
  })

  it("has approved FAQ content for every supported storefront locale", () => {
    for (const locale of ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const) {
      expect(getFaqPageData(locale)).not.toBeNull()
    }
  })
})
