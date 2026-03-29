"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { useMemo, useState } from "react";
import { SupportingText } from "@/components/text/supporting-text";

export type AsideFilterChipItem = {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  disabled?: boolean;
};

type AsideFilterChipSectionProps = {
  title: string;
  items: AsideFilterChipItem[];
  onToggle: (itemId: string) => void;
  emptyMessage: string;
  collapseAfter?: number;
  isLoading?: boolean;
};

export function AsideFilterChipSection({
  title,
  items,
  onToggle,
  emptyMessage,
  collapseAfter,
  isLoading = false,
}: AsideFilterChipSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = useMemo(() => {
    if (!collapseAfter || collapseAfter <= 0 || isExpanded) {
      return items;
    }

    return items.slice(0, collapseAfter);
  }, [collapseAfter, isExpanded, items]);

  return (
    <section className="space-y-250">
      <h3 className="text-2xl font-bold leading-tight">{title}</h3>

      {items.length === 0 && (
        <SupportingText className="text-fg-secondary text-sm">
          {emptyMessage}
        </SupportingText>
      )}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-200">
            {visibleItems.map((item) => (
              <Button
                className="rounded-full leading-tight"          
                disabled={isLoading || item.disabled}
                key={item.id}
                onClick={() => onToggle(item.id)}
                size="sm"
              >
                {`${item.label} (${item.count})`}
              </Button>
            ))}
          </div>

          {typeof collapseAfter === "number" &&
            collapseAfter > 0 &&
            items.length > collapseAfter && (
              <Button
                className="text-sm font-semibold text-fg-secondary underline hover:text-primary"
                onClick={() => setIsExpanded((currentState) => !currentState)}
                size="current"
                theme="unstyled"
                type="button"
                variant="secondary"
              >
                {isExpanded ? "Zobraziť menej" : "Zobraziť viac"}
              </Button>
            )}
        </>
      )}
    </section>
  );
}
