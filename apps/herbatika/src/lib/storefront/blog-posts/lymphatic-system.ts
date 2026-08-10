import {
  BLOG_AUTHOR_ROLE,
  EDITORIAL_AUTHOR,
  EDITORIAL_AUTHOR_BIO,
  EDITORIAL_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const LYMPHATIC_SYSTEM_BLOG_POST: BlogPost = {
  author: EDITORIAL_AUTHOR,
  authorBio: EDITORIAL_AUTHOR_BIO,
  authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "krátke prechádzky viackrát denne sú účinnejšie než nárazová záťaž",
    "dbajte na pitný režim počas celého dňa",
    "podporiť môžu aj masáže a jemná mobilita",
  ],
  excerpt:
    "Tipy pre lepší tok lymfy, menšie opuchy a rýchlejšiu regeneráciu po záťaži.",
  id: "blog-8",
  imageSrc:
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
  lead: "Lymfatický systém nemá vlastnú pumpu, preto potrebuje pravidelný pohyb, hydratáciu a podporu regenerácie.",
  publishedAt: "2025-10-12",
  readingTime: "4 min",
  sections: [
    {
      paragraphs: [
        "Po fyzickej aktivite pomáha kombinácia ľahkého pohybu, hydratácie a kvalitného spánku.",
      ],
      title: "Regeneračný režim",
    },
  ],
  slug: "lymfaticky-system-a-regeneracia",
  tags: ["Zdravie"],
  title: "Lymfatický systém a regenerácia",
  topic: "zdravie",
}
