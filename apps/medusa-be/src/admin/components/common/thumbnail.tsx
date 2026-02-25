import { Photo } from "@medusajs/icons"

type ThumbnailProps = {
  src?: string | null
  alt?: string
}

export const Thumbnail = ({ src, alt }: ThumbnailProps) => (
  <div className="flex h-8 w-6 items-center justify-center overflow-hidden rounded-[4px] bg-ui-bg-component">
    {src ? (
      <img
        alt={alt}
        className="h-full w-full object-cover object-center"
        src={src}
      />
    ) : (
      <Photo className="text-ui-fg-subtle" />
    )}
  </div>
)
