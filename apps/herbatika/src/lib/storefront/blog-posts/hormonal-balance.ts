import {
  BLOG_AUTHOR_ROLE,
  MONIKA_AUTHOR,
  MONIKA_AUTHOR_BIO,
  MONIKA_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const HORMONAL_BALANCE_BLOG_POST: BlogPost = {
  author: MONIKA_AUTHOR,
  authorBio: MONIKA_AUTHOR_BIO,
  authorImageSrc: MONIKA_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "stabilný spánok znižuje hormonálne výkyvy",
    "dôležitý je pravidelný príjem bielkovín",
    "podpora pečene a čriev zlepšuje metabolizmus hormónov",
  ],
  excerpt:
    "Kedy má zmysel upraviť stravu, spánok a podporiť telo cielene zvolenými doplnkami.",
  id: "blog-7",
  imageSrc:
    "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80",
  lead: "Hormonálne zdravie je citlivé na stres, spánok aj výživu. Najviac pomáha celkový režim, nie izolovaný doplnok.",
  publishedAt: "2025-10-22",
  readingTime: "7 min",
  sections: [
    {
      paragraphs: [
        "Vyberte si 2 až 3 návyky, ktoré viete reálne dlhodobo udržať, a postupne pridávajte ďalšie.",
      ],
      title: "Ako začať",
    },
  ],
  slug: "hormonalna-rovnovaha-a-kazdodenny-rezim",
  tags: ["Zdravie"],
  title: "Hormonálna rovnováha a každodenný režim",
  topic: "zdravie",
}
