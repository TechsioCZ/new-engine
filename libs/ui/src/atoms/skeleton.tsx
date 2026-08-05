/**
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
        circle: "bg-skeleton-bg-primary",
        rectangle: "bg-skeleton-bg-primary",
        root: "",
        textLine: "bg-skeleton-bg-primary",
      },
      secondary: {
        circle: "bg-skeleton-bg-secondary",
        rectangle: "bg-skeleton-bg-secondary",
        root: "",
        textLine: "bg-skeleton-bg-secondary",
      },
    },
  },
})

interface SkeletonContextValue {
  isLoaded: boolean
  variant?: "primary" | "secondary" | undefined
  speed?: "slow" | "normal" | "fast" | undefined
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null)

const useSkeletonContext = () => useContext(SkeletonContext)

/**
 * Resolves skeleton props with context fallback.
 * Local props override context values.
 */
function useResolvedSkeletonProps(props: {
  isLoaded?: boolean | undefined
  variant?: "primary" | "secondary" | undefined
  speed?: "slow" | "normal" | "fast" | undefined
}) {
  const context = useSkeletonContext()
  return {
    isLoaded: props.isLoaded ?? context?.isLoaded ?? false,
    speed: props.speed ?? context?.speed,
    variant: props.variant ?? context?.variant,
  }
}

interface SkeletonRootProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  isLoaded?: boolean | undefined
  variant?: "primary" | "secondary" | undefined
  speed?: "slow" | "normal" | "fast" | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

export function Skeleton({
  isLoaded = false,
  variant,
  children,
  speed,
  className,
  ref,
  ...props
}: SkeletonRootProps) {
  const styles = skeletonVariants({ speed, variant })

  return (
    <SkeletonContext.Provider value={{ isLoaded, speed, variant }}>
      {isLoaded ? (
        <>{children}</>
      ) : (
        <div
          aria-busy="true"
          aria-label="Loading content"
          className={styles.root({ className })}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )}
    </SkeletonContext.Provider>
  )
}

interface SkeletonCircleProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  size?: "sm" | "md" | "lg" | "xl" | undefined
  speed?: "slow" | "normal" | "fast" | undefined
  isLoaded?: boolean | undefined
  variant?: "primary" | "secondary" | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

Skeleton.Circle = function SkeletonCircle({
  size = "md",
  speed,
  isLoaded,
  variant,
  children,
  className,
  ref,
  ...props
}: SkeletonCircleProps) {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    size,
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return <>{children}</>
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
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
  size?: "sm" | "md" | "lg" | "xl" | undefined
  speed?: "slow" | "normal" | "fast" | undefined
  lastLineWidth?: string | undefined
  isLoaded?: boolean | undefined
  variant?: "primary" | "secondary" | undefined
  children?: ReactNode | undefined
  containerClassName?: string | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

Skeleton.Text = function SkeletonText({
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
}: SkeletonTextProps) {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    size,
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return <>{children}</>
  }

  // Guard against invalid values (negative, NaN, Infinity)
  const lineCount = Number.isFinite(noOfLines) ? Math.max(1, noOfLines) : 1

  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
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
  speed?: "slow" | "normal" | "fast" | undefined
  isLoaded?: boolean | undefined
  variant?: "primary" | "secondary" | undefined
  children?: ReactNode | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

Skeleton.Rectangle = function SkeletonRectangle({
  speed,
  isLoaded,
  variant,
  children,
  className,
  ref,
  ...props
}: SkeletonRectangleProps) {
  const resolved = useResolvedSkeletonProps({ isLoaded, speed, variant })

  const styles = skeletonVariants({
    speed: resolved.speed,
    variant: resolved.variant,
  })

  if (resolved.isLoaded) {
    return <>{children}</>
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
      className={styles.root({ className: styles.rectangle({ className }) })}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}
