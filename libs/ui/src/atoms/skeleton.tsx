/*
 * Skeleton — @techsio/ui-kit atom.
 *
 * @component Skeleton
 * @componentVersion v1.0.0
 * @skill skeleton-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the skeleton-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, useContext } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"

import { tv } from "../utils"

const SKELETON_BG_PRIMARY = "bg-skeleton-bg-primary"
const SKELETON_BG_SECONDARY = "bg-skeleton-bg-secondary"

const skeletonVariants = tv({
  defaultVariants: {
    size: "md",
    speed: "normal",
    variant: "primary",
  },
  slots: {
    circle: ["rounded-full", "shrink-0"],
    rectangle: "w-full",
    root: ["relative overflow-hidden"],
    textContainer: ["flex", "flex-col"],
    textLine: ["h-skeleton-text-line", "rounded-skeleton-text", "w-full"],
  },
  variants: {
    size: {
      lg: {
        circle: "size-skeleton-circle-lg",
        textContainer: "gap-skeleton-text-lg",
      },
      md: {
        circle: "size-skeleton-circle-md",
        textContainer: "gap-skeleton-text-md",
      },
      sm: {
        circle: "size-skeleton-circle-sm",
        textContainer: "gap-skeleton-text-sm",
      },
      xl: {
        circle: "size-skeleton-circle-xl",
        textContainer: "gap-skeleton-text-xl",
      },
    },
    speed: {
      fast: {
        root: "animate-skeleton-pulse-fast",
      },
      normal: {
        root: "animate-skeleton-pulse-normal",
      },
      slow: {
        root: "animate-skeleton-pulse-slow",
      },
    },
    variant: {
      primary: {
        circle: SKELETON_BG_PRIMARY,
        rectangle: SKELETON_BG_PRIMARY,
        root: "",
        textLine: SKELETON_BG_PRIMARY,
      },
      secondary: {
        circle: SKELETON_BG_SECONDARY,
        rectangle: SKELETON_BG_SECONDARY,
        root: "",
        textLine: SKELETON_BG_SECONDARY,
      },
    },
  },
})

type SkeletonVariant = "primary" | "secondary"
type SkeletonSpeed = "slow" | "normal" | "fast"
type SkeletonSize = "sm" | "md" | "lg" | "xl"

/*
 * Every inherited value lives in its own context so the root never has to build a
 * context value object during render.
 */
const SkeletonIsLoadedContext = createContext<boolean | undefined>(undefined)
const SkeletonSpeedContext = createContext<SkeletonSpeed | undefined>(undefined)
const SkeletonVariantContext = createContext<SkeletonVariant | undefined>(
  undefined,
)

/**
 * Resolves skeleton props with context fallback.
 * Local props override context values.
 */
const useResolvedSkeletonProps = (props: {
  isLoaded?: boolean | undefined
  variant?: SkeletonVariant | undefined
  speed?: SkeletonSpeed | undefined
}) => {
  const contextIsLoaded = useContext(SkeletonIsLoadedContext)
  const contextSpeed = useContext(SkeletonSpeedContext)
  const contextVariant = useContext(SkeletonVariantContext)

  return {
    isLoaded: props.isLoaded ?? contextIsLoaded ?? false,
    speed: props.speed ?? contextSpeed,
    variant: props.variant ?? contextVariant,
  }
}

interface SkeletonRootProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  isLoaded?: boolean | undefined
  variant?: SkeletonVariant | undefined
  speed?: SkeletonSpeed | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

export const Skeleton = ({
  isLoaded = false,
  variant,
  children,
  speed,
  className,
  ref,
  ...props
}: SkeletonRootProps): ReactNode => {
  const styles = skeletonVariants({ speed, variant })

  return (
    <SkeletonIsLoadedContext.Provider value={isLoaded}>
      <SkeletonSpeedContext.Provider value={speed}>
        <SkeletonVariantContext.Provider value={variant}>
          {isLoaded ? (
            children
          ) : (
            <div
              aria-busy="true"
              className={styles.root({ className })}
              ref={ref}
              {...props}
            >
              {children}
            </div>
          )}
        </SkeletonVariantContext.Provider>
      </SkeletonSpeedContext.Provider>
    </SkeletonIsLoadedContext.Provider>
  )
}

interface SkeletonCircleProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  size?: SkeletonSize | undefined
  speed?: SkeletonSpeed | undefined
  isLoaded?: boolean | undefined
  variant?: SkeletonVariant | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

const SkeletonCircle = ({
  size = "md",
  speed,
  isLoaded,
  variant,
  children,
  className,
  ref,
  ...props
}: SkeletonCircleProps): ReactNode => {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    size,
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return children
  }

  return (
    <div
      aria-busy="true"
      className={styles.root({
        className: styles.circle({ className }),
      })}
      ref={ref}
      {...props}
    />
  )
}

interface SkeletonTextProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  noOfLines?: number | undefined
  size?: SkeletonSize | undefined
  speed?: SkeletonSpeed | undefined
  lastLineWidth?: string | undefined
  isLoaded?: boolean | undefined
  variant?: SkeletonVariant | undefined
  children?: ReactNode | undefined
  containerClassName?: string | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

const SkeletonText = ({
  noOfLines = 3,
  size = "md",
  speed,
  lastLineWidth = "80%",
  isLoaded,
  variant,
  children,
  containerClassName,
  className,
  ref,
  ...props
}: SkeletonTextProps): ReactNode => {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    size,
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return children
  }

  // Guard against invalid values (negative, NaN, Infinity)
  const lineCount = Number.isFinite(noOfLines) ? Math.max(1, noOfLines) : 1

  return (
    <div
      aria-busy="true"
      className={styles.textContainer({ className: containerClassName })}
      ref={ref}
      {...props}
    >
      {Array.from({ length: lineCount }).map((_, index) => {
        const isLastLine = index === lineCount - 1
        const width = isLastLine && lineCount > 1 ? lastLineWidth : "100%"

        return (
          <div
            className={styles.root({
              className: styles.textLine({ className }),
            })}
            key={`skeleton-text-${index}`}
            style={{ width }}
          />
        )
      })}
    </div>
  )
}

interface SkeletonRectangleProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  speed?: SkeletonSpeed | undefined
  isLoaded?: boolean | undefined
  variant?: SkeletonVariant | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

const SkeletonRectangle = ({
  speed,
  isLoaded,
  variant,
  children,
  className,
  ref,
  ...props
}: SkeletonRectangleProps): ReactNode => {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return children
  }

  return (
    <div
      aria-busy="true"
      className={styles.root({ className: styles.rectangle({ className }) })}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

Skeleton.Circle = SkeletonCircle
Skeleton.Text = SkeletonText
Skeleton.Rectangle = SkeletonRectangle
