"use client";

import type {
  ProductDetailContentSection,
  ProductMediaFact,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer";
import { asRecord, asString } from "@/components/product-detail/utils/value-utils";

const CAPSULE_COUNT_PATTERN =
  /(\d{1,4})\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/gi;

const DAILY_CAPSULE_PATTERNS = [
  /(\d+)\s*x\s*denne[^0-9]{0,20}(\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/i,
  /(\d+)\s*[-–]\s*(\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\s*(?:denne|za deň|za den|daily)\b/i,
  /(\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\s*(?:denne|za deň|za den|daily)\b/i,
  /(?:odporúčaná|odporucana|denná|denna)[^.]{0,60}?(\d+)\s*(?:kaps[úu]l(?:a|y|i|í)?|capsules?|caps)\b/i,
];

const resolveDoseWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "dávka";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "dávky";
  }

  return "dávok";
};

const resolveCapsuleWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "kapsula";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "kapsuly";
  }

  return "kapsúl";
};

const parsePositiveInt = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const collectCapsuleCounts = (text: string): number[] => {
  const matches: number[] = [];
  CAPSULE_COUNT_PATTERN.lastIndex = 0;

  let match = CAPSULE_COUNT_PATTERN.exec(text);
  while (match) {
    const parsed = parsePositiveInt(match[1]);
    if (parsed) {
      matches.push(parsed);
    }

    match = CAPSULE_COUNT_PATTERN.exec(text);
  }

  return matches;
};

const resolveCapsuleCount = (texts: string[]): number | null => {
  const candidates = texts.flatMap((text) => collectCapsuleCounts(text));
  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
};

const resolveDailyCapsuleDose = (texts: string[]): number | null => {
  for (const text of texts) {
    for (const pattern of DAILY_CAPSULE_PATTERNS) {
      const match = pattern.exec(text);
      if (!match) {
        continue;
      }

      if (match[2]) {
        const timesPerDay = parsePositiveInt(match[1]);
        const capsulesPerIntake = parsePositiveInt(match[2]);
        if (timesPerDay && capsulesPerIntake) {
          return timesPerDay * capsulesPerIntake;
        }
      }

      const directDose = parsePositiveInt(match[1]);
      if (directDose) {
        return directDose;
      }
    }
  }

  return null;
};

const collectParameterTexts = (product: StorefrontProduct | null): string[] => {
  const metadata = asRecord(product?.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const parameters = Array.isArray(topOffer?.parameters) ? topOffer.parameters : [];

  return parameters
    .map((parameter) => asRecord(parameter))
    .filter((parameter): parameter is Record<string, unknown> => Boolean(parameter))
    .map((parameter) => [asString(parameter.name), asString(parameter.value)])
    .flat()
    .filter((value): value is string => Boolean(value));
};

const collectTexts = (
  product: StorefrontProduct | null,
  sections: ProductDetailContentSection[],
): string[] => {
  if (!product) {
    return [];
  }

  const metadata = asRecord(product.metadata);
  const shortDescriptionText = stripHtml(asString(metadata?.short_description));
  const sectionTexts = sections.map((section) => stripHtml(section.html)).filter(Boolean);
  const parameterTexts = collectParameterTexts(product);

  return [
    product.title ?? "",
    stripHtml(product.description),
    shortDescriptionText,
    ...sectionTexts,
    ...parameterTexts,
  ].filter((value): value is string => Boolean(value));
};

export const resolveProductMediaFacts = (
  product: StorefrontProduct | null,
  sections: ProductDetailContentSection[],
): ProductMediaFact[] => {
  const texts = collectTexts(product, sections);
  if (texts.length === 0) {
    return [];
  }

  const capsuleCount = resolveCapsuleCount(texts);
  if (!capsuleCount) {
    return [];
  }

  const dailyDose = resolveDailyCapsuleDose(texts) ?? 1;
  const safeDailyDose = Math.max(1, dailyDose);
  const doses = Math.max(1, Math.floor(capsuleCount / safeDailyDose));

  return [
    {
      id: "doses",
      icon: "icon-[mdi--calendar-month-outline]",
      value: `${doses}`,
      label: resolveDoseWord(doses),
    },
    {
      id: "daily-intake",
      icon: "icon-[mdi--pill]",
      value: `${safeDailyDose}`,
      label: `${resolveCapsuleWord(safeDailyDose)} denne`,
    },
  ];
};
