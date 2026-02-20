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

export type ReviewItem = {
  id: string;
  author: string;
  title: string;
  message: string;
  rating: number;
};

export type BlogTeaserItem = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  imageSrc: string;
};

export type ProductSectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
};
