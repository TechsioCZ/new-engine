import { aboutHero, aboutSections } from "./about-page-article.data"
import { ABOUT_PAGE_SUPPORTING } from "./about-page-supporting.data"

export type { AboutParagraph } from "./about-page.types"

export const ABOUT_PAGE = {
  hero: aboutHero,
  sections: aboutSections,
  ...ABOUT_PAGE_SUPPORTING,
} as const
