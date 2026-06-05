import type {
  BlogPost,
  BlogPostSection,
  BlogTopicKey,
} from "@/lib/storefront/blog-content";
import {
  fetchCmsJson,
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-client";
import type {
  CmsArticle,
  CmsArticleCategory,
  CmsBlogTopic,
  CmsCategory,
} from "./cms-types";

const DEFAULT_CMS_TOPIC: CmsBlogTopic = "zdravie";
const DEFAULT_AUTHOR_IMAGE =
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80";
const DEFAULT_ARTICLE_IMAGE =
  "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=1200&q=80";

type CmsArticlePresentationOverride = {
  bulletPoints?: string[];
  contentHtml?: string;
  excerpt?: string;
  lead?: string;
  readingTime?: string;
  sections?: BlogPostSection[];
  tags?: string[];
  title?: string;
  topic?: CmsBlogTopic;
};

const TEST_SYNC_SECTIONS: BlogPostSection[] = [
  {
    title: "Prečo si moringa získava pozornosť",
    paragraphs: [
      "Moringa je prirodzene bohatá na rastlinné látky, minerály a antioxidanty. V každodennej rutine môže doplniť pestrú stravu najmä v období únavy alebo zvýšenej záťaže.",
      "Najpraktickejšou formou je jemný prášok, ktorý sa dá zamiešať do smoothie, vody, jogurtu alebo raňajkovej kaše.",
    ],
  },
  {
    title: "Ako ju zaradiť do denného režimu",
    paragraphs: [
      "Začnite menšou dávkou a sledujte, ako vám vyhovuje chuť aj trávenie. Pri rastlinných superpotravinách je dôležitá pravidelnosť, nie nárazové vysoké dávky.",
      "Moringa sa dobre kombinuje s ovocím, rastlinným mliekom, citrónom alebo zelenými potravinami.",
    ],
  },
];

const stagingArticlePresentationBySlug: Record<
  string,
  CmsArticlePresentationOverride
> = {
  "cms-test-clanok": {
    excerpt:
      "Prečo sa moringa označuje ako strom života, aké živiny prináša a ako ju jednoducho zaradiť do jedálnička.",
    lead:
      "Moringa oleifera je rastlina s vysokým obsahom mikroživín a antioxidantov. V praxi je zaujímavá najmä v jednoduchej práškovej forme.",
    readingTime: "6 min",
    tags: ["Moringa", "Zdravie", "Doplnky výživy"],
    title: "Moringa: strom života a jej miesto vo výžive",
    topic: "zdravie",
  },
  "test-sync": {
    contentHtml: "",
    excerpt:
      "Praktický sprievodca zelenou superpotravinou pre viac energie, pestrejšiu výživu a jednoduché každodenné použitie.",
    lead:
      "Moringa patrí medzi obľúbené rastlinné superpotraviny. Pozrite sa, kedy po nej siahnuť a ako ju používať bez zbytočných komplikácií.",
    readingTime: "4 min",
    sections: TEST_SYNC_SECTIONS,
    tags: ["Moringa", "Prírodná výživa"],
    title: "Moringa v prášku: ako ju zaradiť do denného režimu",
    topic: "zdravie",
  },
};

type CmsArticleCategoriesResponse = {
  articleCategories?: CmsArticleCategory[] | null;
};

type CmsArticleResponse = {
  article?: CmsArticle | null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeVisibleCmsText = (value: string) =>
  value
    .replace(/\bPayload\s+Admin\b/gi, "Herbatika redakcia")
    .replace(/\bPayload\s+CMS\b/gi, "redakcie Herbatika")
    .replace(/\bPayload\b/gi, "Herbatika");

const sanitizeVisibleCmsHtml = (value: string) =>
  value
    .split(/(<[^>]*>)/g)
    .map((part) => (part.startsWith("<") ? part : sanitizeVisibleCmsText(part)))
    .join("");

const stripCmsMediaImages = (html: string) =>
  html.replace(
    /<img\b[^>]*\bsrc=["'][^"']*\/api\/media\/file\/[^"']+["'][^>]*\/?>/gi,
    "",
  );

const sanitizeTag = (value: string) =>
  /^test(?:\s+kateg[oó]ria)?$/i.test(value.trim())
    ? "Zdravie"
    : sanitizeVisibleCmsText(value);

const resolveTopicFromCategory = (
  category: CmsCategory | null | undefined,
): Exclude<BlogTopicKey, "all"> => {
  switch (category?.slug) {
    case "beauty":
    case "krasa":
      return "krasa";
    case "fitness":
    case "sport":
      return "fitness";
    default:
      return DEFAULT_CMS_TOPIC;
  }
};

const resolveAuthorName = (article: CmsArticle) => {
  const authorParts = [article.author?.firstName, article.author?.lastName]
    .map(trimString)
    .filter(Boolean);

  const authorName = authorParts.join(" ");

  return !authorName || /^payload\s+admin$/i.test(authorName)
    ? "Herbatika redakcia"
    : sanitizeVisibleCmsText(authorName);
};

const resolvePublishedAt = (article: CmsArticle) => {
  const publishedAt =
    trimString(article.publishedAt) || trimString(article.publishedDate);

  if (!publishedAt) {
    return new Date(0).toISOString();
  }

  const time = new Date(publishedAt).getTime();

  return Number.isFinite(time) ? publishedAt : new Date(0).toISOString();
};

const resolveReadingTime = (value: CmsArticle["readingTime"]) => {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  const minutes = Number.isFinite(parsed) ? Math.max(Math.floor(parsed), 1) : 1;

  return `${minutes} min`;
};

const getSortTime = (value: string) => {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
};

export const mapCmsArticleToBlogPost = (
  article: CmsArticle,
): BlogPost | null => {
  const slug = trimString(article.slug);
  const title = sanitizeVisibleCmsText(trimString(article.title));

  if (!slug || !title) {
    return null;
  }

  const categoryLabel = trimString(article.category?.title);
  const articleTags = Array.isArray(article.tags) ? article.tags : [];
  const tags = [
    ...articleTags.filter(isNonEmptyString).map(sanitizeTag),
    ...(categoryLabel ? [sanitizeTag(categoryLabel)] : []),
  ].filter((tag, index, allTags) => allTags.indexOf(tag) === index);
  const presentationOverride = stagingArticlePresentationBySlug[slug];
  const rawContentHtml = sanitizeVisibleCmsHtml(
    rewriteCmsHtmlMediaUrls(article.content),
  );
  const contentHtml = presentationOverride
    ? stripCmsMediaImages(rawContentHtml)
    : rawContentHtml;
  const excerpt =
    sanitizeVisibleCmsText(trimString(article.excerpt)) ||
    stripCmsHtml(contentHtml).slice(0, 180);
  const resolvedTitle = presentationOverride?.title ?? title;
  const resolvedExcerpt = presentationOverride?.excerpt ?? excerpt;
  const publishedAt = resolvePublishedAt(article);
  const fallbackSections =
    contentHtml || !resolvedExcerpt
      ? []
      : [
          {
            title: "Zhrnutie",
            paragraphs: [resolvedExcerpt],
          },
        ];

  return {
    id: `cms-${article.id ?? slug}`,
    slug,
    title: resolvedTitle,
    excerpt: resolvedExcerpt,
    imageSrc:
      resolveCmsMediaUrl(article.featuredImage) ??
      DEFAULT_ARTICLE_IMAGE,
    topic:
      presentationOverride?.topic ?? resolveTopicFromCategory(article.category),
    tags: presentationOverride?.tags ?? (tags.length > 0 ? tags : ["Novinky"]),
    publishedAt,
    author: resolveAuthorName(article),
    authorRole: "Článok pre vás pripravila",
    authorBio:
      "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc: DEFAULT_AUTHOR_IMAGE,
    readingTime:
      presentationOverride?.readingTime ??
      resolveReadingTime(article.readingTime),
    lead: presentationOverride?.lead ?? resolvedExcerpt,
    bulletPoints: presentationOverride?.bulletPoints ?? [],
    contentHtml: presentationOverride?.contentHtml ?? contentHtml,
    sections: presentationOverride?.sections ?? fallbackSections,
  };
};

export const fetchCmsArticleCategories = async () => {
  const response =
    await fetchCmsJson<CmsArticleCategoriesResponse>("article-categories");

  return Array.isArray(response?.articleCategories)
    ? response.articleCategories
    : [];
};

export const fetchCmsArticleBySlug = async (slug: string) => {
  const response = await fetchCmsJson<CmsArticleResponse>(
    `articles/${encodeURIComponent(slug)}`,
  );

  return response?.article ?? null;
};

export const fetchCmsBlogPost = async (slug: string) => {
  const article = await fetchCmsArticleBySlug(slug);

  return article ? mapCmsArticleToBlogPost(article) : null;
};

export const fetchCmsBlogPosts = async () => {
  const categories = await fetchCmsArticleCategories();
  const slugs = Array.from(
    new Set(
      categories.flatMap((category) => {
        const articles = Array.isArray(category.articles)
          ? category.articles
          : [];

        return articles
          .map((article) => article.slug?.trim())
          .filter(isNonEmptyString);
      }),
    ),
  );

  const articles = await Promise.all(slugs.map(fetchCmsArticleBySlug));

  return articles
    .map((article) => (article ? mapCmsArticleToBlogPost(article) : null))
    .filter((post): post is BlogPost => Boolean(post))
    .sort((left, right) => {
      return getSortTime(right.publishedAt) - getSortTime(left.publishedAt);
    });
};
