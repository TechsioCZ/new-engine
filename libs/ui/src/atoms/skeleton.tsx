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
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
} from "react"
import { tv } from "../utils"

const skeletonVariants = tv({
  slots: {
    root: ["relative overflow-hidden"],
    rectangle: "w-full",
    circle: ["rounded-full", "shrink-0"],
    textContainer: ["flex", "flex-col"],
    textLine: ["h-skeleton-text-line", "rounded-skeleton-text", "w-full"],
  },
  variants: {
    variant: {
      primary: {
        root: "",
        circle: "bg-skeleton-bg-primary",
        rectangle: "bg-skeleton-bg-primary",
        textLine: "bg-skeleton-bg-primary",
      },
      secondary: {
        root: "",
        circle: "bg-skeleton-bg-secondary",
        rectangle: "bg-skeleton-bg-secondary",
        textLine: "bg-skeleton-bg-secondary",
      },
    },
    size: {
      sm: {
        circle: "size-skeleton-circle-sm",
        textContainer: "gap-skeleton-text-sm",
      },
      md: {
        circle: "size-skeleton-circle-md",
        textContainer: "gap-skeleton-text-md",
      },
      lg: {
        circle: "size-skeleton-circle-lg",
        textContainer: "gap-skeleton-text-lg",
      },
      xl: {
        circle: "size-skeleton-circle-xl",
        textContainer: "gap-skeleton-text-xl",
      },
    },
    speed: {
      slow: {
        root: "animate-skeleton-pulse-slow",
      },
      normal: {
        root: "animate-skeleton-pulse-normal",
      },
      fast: {
        root: "animate-skeleton-pulse-fast",
      },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
    speed: "normal",
  },
})

interface SkeletonContextValue {
  isLoaded: boolean
  variant?: "primary" | "secondary"
  speed?: "slow" | "normal" | "fast"
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null)

const useSkeletonContext = () => useContext(SkeletonContext)

/**
 * Resolves skeleton props with context fallback.
 * Local props override context values.
 */
function useResolvedSkeletonProps(props: {
  isLoaded?: boolean
  variant?: "primary" | "secondary"
  speed?: "slow" | "normal" | "fast"
}) {
  const context = useSkeletonContext()
  return {
    isLoaded: props.isLoaded ?? context?.isLoaded ?? false,
    variant: props.variant ?? context?.variant,
    speed: props.speed ?? context?.speed,
  }
}

interface SkeletonRootProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  isLoaded?: boolean
  variant?: "primary" | "secondary"
  speed?: "slow" | "normal" | "fast"
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
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
  const styles = skeletonVariants({ variant, speed })

  return (
    <SkeletonContext.Provider value={{ isLoaded, variant, speed }}>
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

interface SkeletonCircleProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  size?: "sm" | "md" | "lg" | "xl"
  speed?: "slow" | "normal" | "fast"
  isLoaded?: boolean
  variant?: "primary" | "secondary"
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
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
  const resolved = useResolvedSkeletonProps({ isLoaded, variant, speed })

  const styles = skeletonVariants({
    size,
    variant: resolved.variant,
    speed: resolved.speed,
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

interface SkeletonTextProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  noOfLines?: number
  size?: "sm" | "md" | "lg" | "xl"
  speed?: "slow" | "normal" | "fast"
  lastLineWidth?: string
  isLoaded?: boolean
  variant?: "primary" | "secondary"
  children?: ReactNode
  containerClassName?: string
  ref?: Ref<HTMLDivElement>
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
  const resolved = useResolvedSkeletonProps({ isLoaded, variant, speed })

  const styles = skeletonVariants({
    size,
    variant: resolved.variant,
    speed: resolved.speed,
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

interface SkeletonRectangleProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  speed?: "slow" | "normal" | "fast"
  isLoaded?: boolean
  variant?: "primary" | "secondary"
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
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
  const resolved = useResolvedSkeletonProps({ isLoaded, variant, speed })

  const styles = skeletonVariants({
    variant: resolved.variant,
    speed: resolved.speed,
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
