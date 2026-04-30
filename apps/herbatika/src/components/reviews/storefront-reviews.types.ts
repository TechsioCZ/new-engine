import type { StaticImageData } from "next/image";

export type StorefrontReviewItem = {
  id: string;
  author: string;
  dateLabel: string;
  message: string;
  title?: string;
  rating: number;
  verifiedPurchase?: boolean;
};

export type StorefrontReviewTrustSource = {
  id: string;
  logo: StaticImageData;
  logoAlt: string;
  logoWidth: number;
  scoreLabel: string;
  reviewCountLabel: string;
};
