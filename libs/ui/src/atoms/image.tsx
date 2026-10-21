/**
 * Image — @techsio/ui-kit atom.
 *
 * @component Image
 * @componentVersion v1.2.0
 * @skill image-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the image-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type ReactEventHandler,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon } from "./icon"

const imageVariants = tv({
  base: "block max-w-full object-cover",
  variants: {
    size: {
      sm: "size-image-sm",
      md: "size-image-md",
      lg: "size-image-lg",
      full: "w-full",
      custom: "",
    },
  },
  defaultVariants: {
    size: "full",
  },
})

export type BaseImageProps = {
  src: string
  alt: string
  className?: string
}

type HasImageProps<T extends ElementType> =
  "src" extends keyof ComponentPropsWithRef<T>
    ? "alt" extends keyof ComponentPropsWithRef<T>
      ? T
      : never
    : never

type NativeImageProps = BaseImageProps &
  VariantProps<typeof imageVariants> &
  Omit<
    ComponentPropsWithRef<"img">,
    keyof BaseImageProps | keyof VariantProps<typeof imageVariants>
  >

type CustomImageProps<T extends ElementType> = BaseImageProps &
  VariantProps<typeof imageVariants> &
  Omit<
    ComponentPropsWithRef<HasImageProps<T>>,
    keyof BaseImageProps | keyof VariantProps<typeof imageVariants>
  > & {
    as: HasImageProps<T>
  }

export type ImageProps<T extends ElementType = "img"> = T extends "img"
  ? NativeImageProps & { as?: "img" }
  : CustomImageProps<T>

export function Image<T extends ElementType = "img">({
  as,
  src,
  alt,
  size,
  className,
  ...props
}: ImageProps<T>) {
  const Component = (as || "img") as ElementType

  return (
    <Component
      alt={alt}
      className={imageVariants({ size, className })}
      src={src}
      {...props}
    />
  )
}

const fallbackVariants = tv({
  slots: {
    root: "relative aspect-(--image-aspect-ratio) overflow-hidden bg-image-bg-fallback",
    image: "size-full",
    reservation: "image-reservation block h-auto w-full",
    placeholder:
      "absolute inset-0 flex items-center justify-center text-image-fg-fallback",
    icon: "text-image-fallback-icon",
  },
  variants: {
    failed: { true: { image: "opacity-0" } },
    reserved: { true: { image: "absolute inset-0" } },
  },
})

type HasFallbackEvents<T extends ElementType> =
  | "onError"
  | "onLoad" extends keyof ComponentPropsWithRef<T>
  ? T
  : never

/** Opt-in media box. Adapters must forward native image load/error events. */
export type ImageWithFallbackProps<T extends ElementType = "img"> =
  ImageProps<T> & {
    /** Complete localized accessible description; defaults to the original alt. */
    fallbackLabel?: string
    as?: HasFallbackEvents<T>
  }

export function ImageWithFallback<T extends ElementType = "img">(
  props: ImageWithFallbackProps<T>
) {
  // A new request gets fresh state; no fallback URL, retries or stale error state.
  const sourceKey = `${props.src}|${"srcSet" in props ? props.srcSet : ""}`
  return <ImageFallbackContent<T> key={sourceKey} {...props} />
}

function ImageFallbackContent<T extends ElementType = "img">({
  as,
  src,
  alt,
  size,
  className,
  fallbackLabel,
  ...props
}: ImageWithFallbackProps<T>) {
  const [failed, setFailed] = useState(!src)
  const [loaded, setLoaded] = useState(false)
  const pending = !(failed || loaded)
  const Component = (as || "img") as ElementType
  const width = Number(props.width)
  const height = Number(props.height)
  const reserved =
    Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
  const styles = fallbackVariants({ failed: failed || pending, reserved })
  const reservationStyle = reserved
    ? ({ "--image-aspect-ratio": `${width} / ${height}` } as CSSProperties)
    : undefined
  const onError = props.onError as
    | ReactEventHandler<HTMLImageElement>
    | undefined
  const onLoad = props.onLoad as ReactEventHandler<HTMLImageElement> | undefined
  let imageState = "loaded"
  if (failed) {
    imageState = "error"
  } else if (pending) {
    imageState = "loading"
  }

  return (
    <span
      className={styles.root({ className: imageVariants({ size, className }) })}
      data-image-state={imageState}
      style={reservationStyle}
    >
      {reserved && (
        // A replaced element supplies intrinsic width even in shrink-to-fit parents.
        // Keep it across loading/error/recovery; the adapter cannot resize the box.
        <svg
          aria-hidden="true"
          className={styles.reservation()}
          data-image-reservation=""
          focusable="false"
          height={height}
          width={width}
        />
      )}
      <Component
        {...props}
        alt={failed ? "" : alt}
        aria-hidden={failed ? true : props["aria-hidden"]}
        className={styles.image({
          className: imageVariants({ size, className }),
        })}
        onError={(
          event: Parameters<ReactEventHandler<HTMLImageElement>>[0]
        ) => {
          setFailed(true)
          onError?.(event)
        }}
        onLoad={(event: Parameters<ReactEventHandler<HTMLImageElement>>[0]) => {
          setFailed(false)
          setLoaded(true)
          onLoad?.(event)
        }}
        src={src || undefined}
      />
      {failed && (
        <span
          aria-hidden={!alt || props["aria-hidden"] || undefined}
          aria-label={alt ? (fallbackLabel ?? alt) : undefined}
          className={styles.placeholder()}
          data-image-fallback=""
          role="img"
        >
          <Icon
            className={styles.icon()}
            icon="token-icon-image-unavailable"
            size="current"
          />
        </span>
      )}
    </span>
  )
}
