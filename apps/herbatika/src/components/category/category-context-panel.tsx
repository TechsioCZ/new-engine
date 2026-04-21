"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import { useState } from "react";
import type { CategoryContextIntroSegment } from "@/components/category/category-context.utils";
import {
  CategoryContextImageTileGrid,
  type CategoryContextImageTile,
} from "./category-context-image-tile-grid";

type CategoryContextPanelProps = {
  imageTiles?: CategoryContextImageTile[];
  introSegments?: CategoryContextIntroSegment[] | null;
  introText?: string | null;
};

export function CategoryContextPanel({
  imageTiles,
  introSegments,
  introText,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const introContentText = introSegments?.map((segment) => segment.value).join("") ?? "";
  const hasIntroSegments = Boolean(introSegments && introSegments.length > 0);
  const resolvedIntroText = introText ?? introContentText;
  const shouldShowIntroToggle =
    Boolean(resolvedIntroText && resolvedIntroText.length > 260);

  if (!introText && !hasIntroSegments && !imageTiles?.length) {
    return null;
  }

  return (
    <section className="space-y-350">
      {(introText || hasIntroSegments) && (
        <div className="space-y-150">
          <div
            className={`max-w-none text-sm leading-relaxed text-fg-primary ${
              !isExpanded ? "line-clamp-4" : ""
            }`}
          >
            {hasIntroSegments
              ? introSegments?.map((segment, index) => {
                  if (segment.type === "text") {
                    return (
                      <span key={`intro-text-${index}-${segment.value.slice(0, 10)}`}>
                        {segment.value}
                      </span>
                    );
                  }

                  return (
                    <Link
                      as={NextLink}
                      className="font-semibold text-primary underline underline-offset-2"
                      href={segment.href}
                      key={`intro-link-${index}-${segment.href}`}
                    >
                      {segment.value}
                    </Link>
                  );
                })
              : introText}
          </div>
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
      )}

      {Boolean(imageTiles?.length) ? (
        <CategoryContextImageTileGrid tiles={imageTiles ?? []} />
      ) : null}
    </section>
  );
}
