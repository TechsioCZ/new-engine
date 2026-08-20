import { describe, expect, it } from "vitest"
import type { FaqAnswerBlock, FaqItem } from "./faq-page.data"
import { faqItemCount, faqItems, getFaqPageData } from "./faq-page.data"

const SLOVAK_COMMERCE_CANARY =
  /ahoj@|lenka@|herbatica\.sk|\+421|00421|49\s*€|\bEUR\b/i
const SLOVAK_VISIBLE_COPY_CANARY =
  /Vaša|objednávka|tovar|zľav|Prihláste|prehľad|stiahnutie|reklamáci|predajň|kúpnej/i

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

  it("fails closed instead of falling back to Slovak for unsupported locales", () => {
    expect(getFaqPageData("cs-CZ")).toBeNull()
    expect(getFaqPageData("hu-HU")).toBeNull()
  })
})
