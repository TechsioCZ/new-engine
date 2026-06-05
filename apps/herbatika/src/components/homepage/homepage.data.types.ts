import type { IconType } from "@techsio/ui-kit/atoms/icon";
import type { StorefrontRoute } from "@/lib/route-paths";

export type HeroBannerItem = {
  id: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  href: StorefrontRoute;
  imageSrc: string;
};

export type BlogTeaserItem = {
  id: string;
  title: string;
  excerpt: string;
  href: StorefrontRoute;
  imageSrc: string;
  topic: "fitness" | "krasa" | "zdravie";
  publishedAt: string;
  readingTime: string;
};

export type ProductSectionDefinition = {
  id: string;
  title: string;
  viewAllHref: StorefrontRoute;
};
