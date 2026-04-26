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
      className="space-y-300 text-sm leading-relaxed text-fg-secondary [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg-primary [&_h3]:text-md [&_h3]:font-semibold [&_h3]:text-fg-primary [&_h4]:font-semibold [&_h4]:text-fg-primary [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-500 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-fg-primary [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_td]:border [&_td]:border-border-secondary [&_td]:p-200 [&_th]:border [&_th]:border-border-secondary [&_th]:bg-surface-secondary [&_th]:p-200 [&_th]:text-left [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
