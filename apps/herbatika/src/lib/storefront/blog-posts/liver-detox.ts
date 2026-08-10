import {
  BLOG_AUTHOR_ROLE,
  MONIKA_AUTHOR,
  MONIKA_AUTHOR_BIO,
  MONIKA_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const LIVER_DETOX_BLOG_POST: BlogPost = {
  author: MONIKA_AUTHOR,
  authorBio: MONIKA_AUTHOR_BIO,
  authorImageSrc: MONIKA_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "znížte alkohol a ultraprocesované jedlá",
    "podporte pečeň ostropestrecom",
    "hydratujte počas celého dňa",
  ],
  excerpt:
    "Podpora pečene pomocou byliniek, stravy a režimových opatrení, ktoré majú dlhodobý efekt.",
  id: "blog-10",
  imageSrc:
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  lead: "Pečeň je kľúčový orgán metabolizmu. Podpora funguje najlepšie cez dlhodobé návyky a kvalitný spánok.",
  publishedAt: "2025-09-30",
  readingTime: "5 min",
  sections: [
    {
      paragraphs: [
        "Ostropestrec, púpava a artičok patria medzi najčastejšie používané rastliny pri podpore pečene.",
      ],
      title: "Bylinky pre podporu pečene",
    },
  ],
  slug: "detox-pecene-bez-extremov",
  tags: ["Krása", "Zdravie"],
  title: "Detox pečene bez extrémov",
  topic: "krasa",
}
