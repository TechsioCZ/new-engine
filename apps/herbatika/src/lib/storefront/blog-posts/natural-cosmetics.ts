import {
  BLOG_AUTHOR_ROLE,
  MONIKA_AUTHOR,
  MONIKA_AUTHOR_BIO,
  MONIKA_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const NATURAL_COSMETICS_BLOG_POST: BlogPost = {
  author: MONIKA_AUTHOR,
  authorBio: MONIKA_AUTHOR_BIO,
  authorImageSrc: MONIKA_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "uprednostnite krátke zloženie bez dráždivých parfumov",
    "testujte nové produkty postupne",
    "kombinujte hydratáciu a ochranu bariéry",
  ],
  excerpt:
    "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
  id: "blog-4",
  imageSrc:
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
  lead: "Citlivá pokožka reaguje na parfumáciu a agresívne tenzidy výraznejšie.",
  publishedAt: "2025-11-25",
  readingTime: "4 min",
  sections: [
    {
      paragraphs: [
        "Jemné čistenie, hydratačné sérum a ochranný krém s upokojujúcimi zložkami tvoria dobrý základ.",
      ],
      title: "Základná rutina",
    },
  ],
  slug: "prirodna-kozmetika-a-citliva-pokozka",
  tags: ["Krása"],
  title: "Prírodná kozmetika a citlivá pokožka",
  topic: "krasa",
}
