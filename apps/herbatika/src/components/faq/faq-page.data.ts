import { primaryFaqItems } from "./faq-page-items-primary"
import { secondaryFaqItems } from "./faq-page-items-secondary"
import type { FaqItem } from "./faq-page.types"

export type { FaqAnswerBlock, FaqItem, FaqLink } from "./faq-page.types"

export const faqItems = [
  ...primaryFaqItems,
  ...secondaryFaqItems,
] satisfies FaqItem[]

export const faqItemCount = faqItems.length
