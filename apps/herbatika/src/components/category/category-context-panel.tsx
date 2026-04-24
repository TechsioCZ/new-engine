"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { useMemo, useState } from "react";
import {
  sanitizeHtml,
  stripHtml,
} from "@/components/product-detail/utils/html-sanitizer";
import {
  CategoryContextImageTileGrid,
  type CategoryContextImageTile,
} from "./category-context-image-tile-grid";

type CategoryContextPanelProps = {
  imageTiles?: CategoryContextImageTile[];
  introHtml?: string | null;
  introText?: string | null;
};

const CATEGORY_INTRO_RICH_TEXT_CLASS =
  "max-w-none font-verdana text-sm leading-relaxed text-fg-primary sm:text-md [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_em]:italic [&_h2]:mt-500 [&_h2]:font-rubik [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-400 [&_li]:list-disc [&_p+p]:mt-0 [&_strong]:font-bold [&_ul]:mt-250";

export function CategoryContextPanel({
  imageTiles,
  introHtml,
  introText,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sanitizedIntroHtml = useMemo(
    () => (introHtml ? sanitizeHtml(introHtml) : ""),
    [introHtml],
  );
  const resolvedIntroText = sanitizedIntroHtml
    ? stripHtml(sanitizedIntroHtml)
    : (introText ?? "");
  const shouldShowIntroToggle = Boolean(
    resolvedIntroText && resolvedIntroText.length > 260,
  );

  if (!sanitizedIntroHtml && !introText && !imageTiles?.length) {
    return null;
  }

  return (
    <section className="space-y-350">
      {sanitizedIntroHtml || introText ? (
        <div className="space-y-150">
          {sanitizedIntroHtml ? (
            <div
              className={`${CATEGORY_INTRO_RICH_TEXT_CLASS} ${
                !isExpanded ? "line-clamp-4" : ""
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizedIntroHtml }}
            />
          ) : (
            <div
              className={`max-w-none font-verdana text-sm leading-relaxed text-fg-primary sm:text-md ${
                !isExpanded ? "line-clamp-4" : ""
              }`}
            >
              {introText}
            </div>
          )}
          {shouldShowIntroToggle ? (
            <Button
              className="p-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setIsExpanded((previousValue) => !previousValue);
              }}
              size="current"
              theme="unstyled"
              type="button"
            >
              {isExpanded ? "Zobraziť menej" : "Zobraziť viac"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {Boolean(imageTiles?.length) ? (
        <CategoryContextImageTileGrid tiles={imageTiles ?? []} />
      ) : null}
    </section>
  );
}
