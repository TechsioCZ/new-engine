import { describe, expect, it } from "vitest"
import {
  buildProductReviewRequestUrl,
  getReviewRequestCopy,
} from "../../src/utils/order-review-requests"

describe("product review request URL", () => {
  it.each([
    ["sk", "/recenzie/produkt/Token%2FExact%2BCase"],
    ["cz", "/recenze/produkt/Token%2FExact%2BCase"],
    ["hu", "/velemenyek/termek/Token%2FExact%2BCase"],
    ["ro", "/recenzii/produs/Token%2FExact%2BCase"],
  ] as const)("targets the exact %s review-token route", (market, path) => {
    expect(
      buildProductReviewRequestUrl({
        marketCode: market,
        storefrontUrl: "https://store.example.test/ignored/path",
        token: "Token/Exact+Case",
      })
    ).toBe(`https://store.example.test${path}`)
  })

  it.each([
    [
      "sk-SK",
      "Napíšte recenziu produktu",
      "Podeľte sa o skúsenosť s produktom",
    ],
    ["cs-CZ", "Napište recenzi produktu", "Podělte se o zkušenost s produktem"],
    [
      "hu-HU",
      "Írjon véleményt a termékről",
      "Ossza meg a termékkel kapcsolatos tapasztalatait",
    ],
    [
      "ro-RO",
      "Scrieți o recenzie pentru produs",
      "Împărtășiți experiența dumneavoastră cu produsul",
    ],
  ])("provides localized %s review copy", (locale, action, message) => {
    expect(getReviewRequestCopy(locale)).toMatchObject({ action, message })
  })
})
