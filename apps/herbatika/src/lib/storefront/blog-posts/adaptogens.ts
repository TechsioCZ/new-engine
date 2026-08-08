import {
  BLOG_AUTHOR_ROLE,
  EDITORIAL_AUTHOR,
  EDITORIAL_AUTHOR_BIO,
  EDITORIAL_AUTHOR_IMAGE,
} from "../blog-post-authors"
import type { BlogPost } from "../blog-types"

export const ADAPTOGENS_BLOG_POST: BlogPost = {
  author: EDITORIAL_AUTHOR,
  authorBio: EDITORIAL_AUTHOR_BIO,
  authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
  authorRole: BLOG_AUTHOR_ROLE,
  bulletPoints: [
    "rhodiola podporuje energiu a koncentráciu",
    "ženšen pomáha pri únave",
    "pri výbere sledujte štandardizované extrakty",
  ],
  excerpt:
    "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
  id: "blog-3",
  imageSrc:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  lead: "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu.",
  publishedAt: "2025-12-02",
  readingTime: "6 min",
  sections: [
    {
      paragraphs: [
        "Vyberajte produkty so štandardizovaným extraktom a transparentným zložením.",
      ],
      title: "Ako vyberať adaptogény",
    },
  ],
  slug: "adaptogeny-kedy-ich-zaradit-do-svojho-rezimu",
  tags: ["Fitness"],
  title: "Adaptogény: kedy ich zaradiť do svojho režimu",
  topic: "fitness",
}
