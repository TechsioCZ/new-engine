import type { IconType } from "@techsio/ui-kit/atoms/icon";

export type HeroBannerItem = {
  id: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  href: string;
  imageSrc: string;
};

export type BlogTeaserItem = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  imageSrc: string;
  topic: "fitness" | "krasa" | "zdravie";
  publishedAt: string;
  readingTime: string;
};

export type ProductSectionDefinition = {
  id: string;
  title: string;
  viewAllHref: string;
};
