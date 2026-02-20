"use client";

import { useMemo } from "react";
import { sanitizeHtml } from "@/components/product-detail/utils/html-sanitizer";

type ProductDetailHtmlContentProps = {
  html: string;
  fallback: string;
};

export function ProductDetailHtmlContent({
  html,
  fallback,
}: ProductDetailHtmlContentProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  if (!sanitizedHtml) {
    return <p className="text-sm leading-relaxed text-fg-secondary">{fallback}</p>;
  }

  return (
    <div
      className="space-y-300 text-sm leading-relaxed text-fg-secondary"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
