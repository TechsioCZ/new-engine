"use client"

import type {
  Product,
  ProductDetailContentSection,
  ProductMediaFact,
} from "@/components/product-detail/product-detail.types"
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import {
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"

const CAPSULE_COUNT_PATTERN =
  /(?:\d{1,4})\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/giu

const DAILY_CAPSULE_PATTERNS = [
  /(?:\d+)\s*x\s*denne[^0-9]{0,20}(?:\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/iu,
  /(?:\d+)\s*[-–]\s*(?:\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\s*(?:denne|za deň|za den|daily)\b/iu,
  /(?:\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\s*(?:denne|za deň|za den|daily)\b/iu,
  /(?:odporúčaná|odporucana|denná|denna)[^.]{0,60}?(?:\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/iu,
]

const parsePositiveInt = (value: string | undefined): number | null => {
  if (value === undefined || value === "") {
    return null
  }

  const parsed = Math.trunc(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

const collectCapsuleCounts = (text: string): number[] => {
  const matches: number[] = []
  CAPSULE_COUNT_PATTERN.lastIndex = 0

  let match = CAPSULE_COUNT_PATTERN.exec(text)
  while (match) {
    const [matchedCount] = match[0].match(/\d+/gu) ?? []
    const parsed = parsePositiveInt(matchedCount)
    if (parsed !== null) {
      matches.push(parsed)
    }

    match = CAPSULE_COUNT_PATTERN.exec(text)
  }

  return matches
}

const resolveCapsuleCount = (texts: string[]): number | null => {
  const candidates = texts.flatMap((text) => collectCapsuleCounts(text))
  if (candidates.length === 0) {
    return null
  }

  return Math.max(...candidates)
}

const resolveDailyCapsuleMatchDose = (
  match: RegExpExecArray,
): number | null => {
  const [firstCount, secondCount] = match[0].match(/\d+/gu) ?? []
  if (secondCount !== undefined) {
    const timesPerDay = parsePositiveInt(firstCount)
    const capsulesPerIntake = parsePositiveInt(secondCount)
    return timesPerDay !== null && capsulesPerIntake !== null
      ? timesPerDay * capsulesPerIntake
      : null
  }

  return parsePositiveInt(firstCount)
}

const resolveDailyCapsuleDose = (texts: string[]): number | null => {
  for (const text of texts) {
    for (const pattern of DAILY_CAPSULE_PATTERNS) {
      const match = pattern.exec(text)
      if (match !== null) {
        const dose = resolveDailyCapsuleMatchDose(match)
        if (dose !== null) {
          return dose
        }
      }
    }
  }

  return null
}

const collectParameterTexts = (product: Product | null): string[] => {
  const metadata = asRecord(product?.metadata)
  const topOffer = asRecord(readRecordProperty(metadata, "top_offer"))
  const parametersValue = readRecordProperty(topOffer, "parameters")
  const parameters = Array.isArray(parametersValue) ? parametersValue : []

  return parameters.flatMap((parameter) => {
    const parameterRecord = asRecord(parameter)
    if (parameterRecord === null) {
      return []
    }

    return [
      asString(readRecordProperty(parameterRecord, "name")),
      asString(readRecordProperty(parameterRecord, "value")),
    ].flatMap((value) => (value === null ? [] : [value]))
  })
}

const collectTexts = (
  product: Product | null,
  sections: ProductDetailContentSection[],
): string[] => {
  if (product === null) {
    return []
  }

  const metadata = asRecord(product.metadata)
  const shortDescriptionText = stripHtml(
    asString(readRecordProperty(metadata, "short_description")),
  )
  const sectionTexts = sections.flatMap((section) => {
    const text = stripHtml(section.html)
    return text === "" ? [] : [text]
  })
  const parameterTexts = collectParameterTexts(product)

  return [
    product.title ?? "",
    stripHtml(product.description),
    shortDescriptionText,
    ...sectionTexts,
    ...parameterTexts,
  ].filter((value): value is string => value !== "")
}

export const resolveProductMediaFacts = (
  product: Product | null,
  sections: ProductDetailContentSection[],
  labels: {
    doses: (count: number) => string
    dailyCapsules: (count: number) => string
  },
): ProductMediaFact[] => {
  const texts = collectTexts(product, sections)
  if (texts.length === 0) {
    return []
  }

  const capsuleCount = resolveCapsuleCount(texts)
  if (capsuleCount === null) {
    return []
  }

  const dailyDose = resolveDailyCapsuleDose(texts) ?? 1
  const safeDailyDose = Math.max(1, dailyDose)
  const doses = Math.max(1, Math.floor(capsuleCount / safeDailyDose))

  return [
    {
      icon: "token-icon-calendar",
      id: "doses",
      label: labels.doses(doses),
      value: `${doses}`,
    },
    {
      icon: "token-icon-pill",
      id: "daily-intake",
      label: labels.dailyCapsules(safeDailyDose),
      value: `${safeDailyDose}`,
    },
  ]
}
