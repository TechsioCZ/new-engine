import {
  BLOG_AUTHOR_ROLE,
  EDITORIAL_AUTHOR,
  EDITORIAL_AUTHOR_BIO,
  EDITORIAL_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const DIGESTION_BLOG_POST: BlogPost = {
  author: EDITORIAL_AUTHOR,
  authorBio: EDITORIAL_AUTHOR_BIO,
  authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "raňajky a večeru plánujte v pravidelných časoch",
    "do jedálnička zaraďte fermentované potraviny",
    "obmedzte dlhodobý nadbytok ultraprocesovaných potravín",
  ],
  excerpt:
    "Mikrobiom, vláknina a základné návyky, ktoré zlepšujú trávenie aj energiu počas dňa.",
  id: "blog-5",
  imageSrc:
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
  lead: "Zdravé trávenie je postavené na pravidelnosti. Pomáha dostatok vlákniny, tekutín a vhodne zvolená suplementácia.",
  publishedAt: "2025-11-14",
  readingTime: "5 min",
  sections: [
    {
      paragraphs: [
        "Probiotiká a prebiotiká majú najlepší efekt pri dlhodobejšom užívaní.",
      ],
      title: "Podpora čriev",
    },
  ],
  slug: "travenie-a-metabolizmus-ako-zacat-od-zakladu",
  tags: ["Zdravie"],
  title: "Trávenie a metabolizmus: ako začať od základu",
  topic: "zdravie",
}
