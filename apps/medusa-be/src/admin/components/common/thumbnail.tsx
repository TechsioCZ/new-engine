import { Photo } from "@medusajs/icons"
import { clx } from "@medusajs/ui"

interface ThumbnailProps {
  src?: string | null
  alt?: string
  className?: string
  fit?: "contain" | "cover"
}

export const Thumbnail = ({
  src,
  alt,
  className,
  fit = "cover",
}: ThumbnailProps) => (
  <div
    className={clx(
      "flex h-8 w-6 items-center justify-center overflow-hidden rounded-[4px] bg-ui-bg-component",
      className,
    )}
  >
    {src === undefined || src === null || src.length === 0 ? (
      <Photo className="text-ui-fg-subtle" />
    ) : (
      <figure
        aria-label={alt ?? "Thumbnail"}
        className={clx(
          "h-full w-full bg-center bg-no-repeat",
          fit === "contain" ? "bg-contain" : "bg-cover",
        )}
        style={{ backgroundImage: `url(${src})` }}
      />
    )}
  </div>
)
