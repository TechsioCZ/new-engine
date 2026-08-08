import {
  BLOG_AUTHOR_ROLE,
  EDITORIAL_AUTHOR,
  EDITORIAL_AUTHOR_BIO,
  EDITORIAL_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const PROBIOTICS_BLOG_POST: BlogPost = {
  author: EDITORIAL_AUTHOR,
  authorBio: EDITORIAL_AUTHOR_BIO,
  authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "zaraďte vlákninu a fermentované potraviny",
    "probiotiká užívajte dlhodobo",
    "obmedzte zbytočný cukor",
  ],
  excerpt:
    "Ako podporiť črevnú mikroflóru bez zbytočne komplikovaných režimov.",
  id: "blog-12",
  imageSrc:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  lead: "Zdravé črevá ovplyvňujú imunitu, energiu aj náladu. Probiotiká majú zmysel pri pravidelnom režime.",
  publishedAt: "2025-09-15",
  readingTime: "5 min",
  sections: [
    {
      paragraphs: [
        "Po antibiotikách, pri dlhodobejšom strese alebo pri nepravidelnom trávení vie cielená probiotická kúra pomôcť stabilizovať stav.",
      ],
      title: "Kedy probiotiká pomáhajú",
    },
  ],
  slug: "probiotika-a-travenie-kazdy-den",
  tags: ["Zdravie"],
  title: "Probiotiká a trávenie každý deň",
  topic: "zdravie",
}
