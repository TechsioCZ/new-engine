"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { useState } from "react";
import {
  CategoryContextImageTileGrid,
  type CategoryContextImageTile,
} from "./category-context-image-tile-grid";

type CategoryContextPanelProps = {
  imageTiles?: CategoryContextImageTile[];
  introText?: string | null;
};

export function CategoryContextPanel({
  imageTiles,
  introText,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const resolvedIntroText = introText ?? "";
  const shouldShowIntroToggle = Boolean(
    resolvedIntroText && resolvedIntroText.length > 260,
  );

  if (!introText && !imageTiles?.length) {
    return null;
  }

  return (
    <section className="space-y-350">
      {introText ? (
        <div className="space-y-150">
          <div
            className={`max-w-none text-sm leading-relaxed text-fg-primary ${
              !isExpanded ? "line-clamp-4" : ""
            }`}
          >
            {introText}
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
      ) : null}

      {Boolean(imageTiles?.length) ? (
        <CategoryContextImageTileGrid tiles={imageTiles ?? []} />
      ) : null}
    </section>
  );
}
