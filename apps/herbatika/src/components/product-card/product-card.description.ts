import type { HttpTypes } from "@medusajs/types";
import { asRecord } from "./product-card.parsers";

const decodeHtmlEntities = (value: string): string => {
  return value
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;/gi, "'");
};

const stripHtml = (value: string): string => {
  return decodeHtmlEntities(value)
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{2,}/g, "\n")
    .replaceAll(/[ \t]{2,}/g, " ")
    .trim();
};

const toBulletLines = (value: string): string | null => {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean);

  if (sentences.length < 2) {
    return null;
  }

  return sentences
    .slice(0, 3)
    .map((sentence) => `• ${sentence}`)
    .join("\n");
};

const extractListItems = (value: string): string[] => {
  const listMatches = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (listMatches.length === 0) {
    return [];
  }

  return listMatches.map((item) => stripHtml(item[1] || "")).filter(Boolean);
};

export const resolveDescription = (
  product: HttpTypes.StoreProduct,
): string | null => {
  const metadata = asRecord(product.metadata);
  const contentSectionsMap = asRecord(metadata?.content_sections_map);
  const descriptionSection =
    typeof contentSectionsMap?.description === "string"
      ? contentSectionsMap.description
      : null;
  const usageSection =
    typeof contentSectionsMap?.usage === "string"
      ? contentSectionsMap.usage
      : null;
  const shortDescription =
    typeof metadata?.short_description === "string"
      ? metadata.short_description
      : null;

  const htmlCandidates = [
    descriptionSection,
    usageSection,
    shortDescription,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  for (const candidate of htmlCandidates) {
    const listItems = extractListItems(candidate);
    if (listItems.length === 0) {
      continue;
    }

    const cardListItems = listItems.length > 1 ? listItems.slice(1) : listItems;

    return cardListItems
      .slice(0, 3)
      .map((item) => `• ${item}`)
      .join("\n");
  }

  const textSource = htmlCandidates.find((candidate) => stripHtml(candidate));
  if (!textSource) {
    return null;
  }

  const text = stripHtml(textSource);
  if (!text) {
    return null;
  }

  return toBulletLines(text) || text;
};
