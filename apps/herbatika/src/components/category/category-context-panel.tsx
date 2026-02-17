"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import NextLink from "next/link";
import { useState } from "react";

type CategoryContextTile = {
  id: string;
  label: string;
  href: string;
  icon: IconType;
};

type CategoryContextPanelProps = {
  introText?: string | null;
  tiles: CategoryContextTile[];
};

type CategoryContextTileSource = {
  id: string;
  label: string;
  href: string;
  handle?: string | null;
};

const DEFAULT_TILE_ICON: IconType = "icon-[mdi--leaf-circle-outline]";

const resolveTileIcon = (handle?: string | null): IconType => {
  if (!handle) {
    return DEFAULT_TILE_ICON;
  }

  if (handle.includes("kozne-problemy")) {
    return "icon-[mdi--hand-back-right-outline]";
  }

  if (handle.includes("mozog-a-nervovy-system")) {
    return "icon-[mdi--brain]";
  }

  if (handle.includes("imunita-a-obranyschopnost")) {
    return "icon-[mdi--shield-check-outline]";
  }

  if (handle.includes("klby-a-pohybovy-aparat")) {
    return "icon-[mdi--bone]";
  }

  if (handle.includes("travenie-a-metabolizmus")) {
    return "icon-[mdi--stomach]";
  }

  if (handle.includes("srdce-a-cievy")) {
    return "icon-[mdi--heart-pulse]";
  }

  if (handle.includes("zenske-zdravie")) {
    return "icon-[mdi--human-female]";
  }

  if (handle.includes("hormonalna-rovnovaha")) {
    return "icon-[mdi--gender-male-female]";
  }

  if (handle.includes("lymfaticky-system")) {
    return "icon-[mdi--water-outline]";
  }

  return DEFAULT_TILE_ICON;
};

export const buildCategoryContextTiles = (
  categories: CategoryContextTileSource[],
): CategoryContextTile[] => {
  const seenLabels = new Set<string>();
  const tiles: CategoryContextTile[] = [];

  for (const category of categories) {
    const normalizedLabel = category.label.trim();
    if (!normalizedLabel) {
      continue;
    }

    const dedupeKey = normalizedLabel.toLocaleLowerCase("sk");
    if (seenLabels.has(dedupeKey)) {
      continue;
    }

    seenLabels.add(dedupeKey);
    tiles.push({
      id: category.id,
      label: normalizedLabel,
      href: category.href,
      icon: resolveTileIcon(category.handle),
    });
  }

  return tiles;
};

export function CategoryContextPanel({
  introText,
  tiles,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowIntroToggle = Boolean(introText && introText.length > 260);

  if (!introText && tiles.length === 0) {
    return null;
  }

  return (
    <section className="space-y-350">
      {introText && (
        <div className="space-y-150">
          <p
            className={`max-w-none text-sm leading-relaxed text-fg-primary ${
              !isExpanded ? "line-clamp-4" : ""
            }`}
          >
            {introText}
          </p>
          {shouldShowIntroToggle && (
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
          )}
        </div>
      )}

      {tiles.length > 0 && (
        <ul className="grid gap-250 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.id}>
              <NextLink
                className="group flex min-h-900 items-center gap-250 rounded-xl border border-border-secondary bg-surface px-300 py-250 text-fg-primary transition-colors hover:border-primary/30 hover:bg-highlight"
                href={tile.href}
              >
                <span className="flex h-600 w-600 shrink-0 items-center justify-center rounded-full bg-highlight text-md text-primary">
                  <Icon className="text-md" icon={tile.icon} />
                </span>
                <span className="text-sm font-semibold leading-tight text-fg-primary transition-colors group-hover:text-primary">
                  {tile.label}
                </span>
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
