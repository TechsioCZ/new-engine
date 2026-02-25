import type { IconType } from "@techsio/ui-kit/atoms/icon";

export type HeroBannerItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  imageSrc: string;
};

export type BenefitItem = {
  id: string;
  title: string;
  description: string;
  icon: IconType;
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
  subtitle: string;
};

export type PurposeCategoryItem = {
  id: string;
  label: string;
  href: string;
  icon: IconType;
};
