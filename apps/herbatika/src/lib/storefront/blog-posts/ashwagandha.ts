import {
  BLOG_AUTHOR_ROLE,
  EDITORIAL_AUTHOR,
  EDITORIAL_AUTHOR_BIO,
  EDITORIAL_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const ASHWAGANDHA_BLOG_POST: BlogPost = {
  author: EDITORIAL_AUTHOR,
  authorBio: EDITORIAL_AUTHOR_BIO,
  authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "ashwagandha je vhodná pri napätí a zhoršenom spánku",
    "podporuje regeneráciu po záťaži",
    "účinky sledujte minimálne 3 až 4 týždne",
  ],
  excerpt:
    "Ashwagandha patrí medzi prírodné adaptogény a vyniká priaznivými účinkami na telo aj myseľ.",
  id: "blog-2",
  imageSrc:
    "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80",
  lead: "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu. Dôležité je správne dávkovanie a načasovanie.",
  publishedAt: "2025-12-05",
  readingTime: "9 min",
  sections: [
    {
      paragraphs: [
        "Pri dlhodobom strese, horšej kvalite spánku alebo psychickom vyčerpaní môže byť ashwagandha vhodnou súčasťou denného režimu.",
      ],
      title: "Kedy ashwagandhu zaradiť",
    },
  ],
  slug: "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
  tags: ["Fitness"],
  title: "Ashwagandha: adaptogén pre rovnováhu tela a mysle",
  topic: "fitness",
}
