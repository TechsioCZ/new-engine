import type { BlogPost, BlogTopicKey } from "@/lib/storefront/blog-content";
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

type CmsArticleCategoriesResponse = {
  articleCategories?: CmsArticleCategory[] | null;
};

type CmsArticleResponse = {
  article?: CmsArticle | null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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
  const authorParts = [
    article.author?.firstName?.trim(),
    article.author?.lastName?.trim(),
  ].filter(Boolean);

  return authorParts.length > 0 ? authorParts.join(" ") : "Herbatika redakcia";
};

export const mapCmsArticleToBlogPost = (
  article: CmsArticle,
): BlogPost | null => {
  const slug = article.slug?.trim();
  const title = article.title?.trim();

  if (!slug || !title) {
    return null;
  }

  const categoryLabel = article.category?.title?.trim();
  const tags = [
    ...(article.tags ?? []).filter(isNonEmptyString),
    ...(categoryLabel ? [categoryLabel] : []),
  ];
  const contentHtml = rewriteCmsHtmlMediaUrls(article.content ?? "");
  const excerpt =
    article.excerpt?.trim() || stripCmsHtml(contentHtml).slice(0, 180);

  return {
    id: `cms-${article.id}`,
    slug,
    title,
    excerpt,
    imageSrc:
      resolveCmsMediaUrl(article.featuredImage) ?? DEFAULT_ARTICLE_IMAGE,
    topic: resolveTopicFromCategory(article.category),
    tags: tags.length > 0 ? tags : ["Novinky"],
    publishedAt: article.publishedDate ?? new Date(0).toISOString(),
    author: resolveAuthorName(article),
    authorRole: "Článok pre vás pripravila",
    authorBio:
      "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc: DEFAULT_AUTHOR_IMAGE,
    readingTime: `${Math.max(article.readingTime ?? 1, 1)} min`,
    lead: excerpt,
    bulletPoints: [],
    contentHtml,
    sections: [],
  };
};

export const fetchCmsArticleCategories = async () => {
  const response =
    await fetchCmsJson<CmsArticleCategoriesResponse>("article-categories");

  return response?.articleCategories ?? [];
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
      categories.flatMap((category) =>
        (category.articles ?? [])
          .map((article) => article.slug?.trim())
          .filter(isNonEmptyString),
      ),
    ),
  );

  const articles = await Promise.all(slugs.map(fetchCmsArticleBySlug));

  return articles
    .map((article) => (article ? mapCmsArticleToBlogPost(article) : null))
    .filter((post): post is BlogPost => Boolean(post))
    .sort((left, right) => {
      return (
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime()
      );
    });
};
