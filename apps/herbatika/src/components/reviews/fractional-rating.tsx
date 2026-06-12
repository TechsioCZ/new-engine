import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { CSSProperties } from "react";

type FractionalRatingProps = {
  className?: string;
  label?: string;
  value: number;
};

const STAR_COUNT = 5;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

export function FractionalRating({
  className,
  label,
  value,
}: FractionalRatingProps) {
  const normalizedValue = Number.isFinite(value)
    ? clamp(value, 0, STAR_COUNT)
    : 0;

  return (
    <span
      aria-label={label ?? `${normalizedValue.toFixed(1)} z ${STAR_COUNT}`}
      className={joinClassNames(
        "inline-flex items-center relative gap-rating-lg text-rating-lg",
        className,
      )}
      role="img"
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const fill = clamp(normalizedValue - index, 0, 1);
        const style = {
          "--star-fill": `${fill * 100}%`,
        } as CSSProperties;

        return (
          <span className="relative inline-grid shrink-0" key={`star-${index + 1}`}>
            <Icon
              className="text-rating-fg-base"
              icon="token-icon-rating"
              size="current"
            />
            <span
              aria-hidden="true"
              className="rating-star-fill pointer-events-none absolute inset-y-0 start-0 overflow-hidden"
              style={style}
            >
              <Icon
                className="text-rating-fg-active absolute"
                icon="token-icon-rating"
                size="current"
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
