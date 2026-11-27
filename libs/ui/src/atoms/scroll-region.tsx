/**
 * ScrollRegion — @techsio/ui-kit atom.
 *
 * @component ScrollRegion
 * @componentVersion v1.0.0
 * @skill scroll-region-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the scroll-region-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type HTMLAttributes,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react"
import { useComposedRefs } from "../internal/molecules/drawer.context"
import { tv } from "../utils"

const scrollRegionVariants = tv({
  base: [
    "min-w-0 max-w-full",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-scroll-region-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
  ],
  variants: {
    orientation: {
      horizontal: "overflow-x-auto",
      vertical: "overflow-y-auto",
      both: "overflow-auto",
    },
  },
  defaultVariants: { orientation: "horizontal" },
})

export type ScrollRegionProps = Omit<
  HTMLAttributes<HTMLElement>,
  "aria-label" | "tabIndex"
> & {
  /** Accessible name, announced when keyboard focus reaches the region. */
  label: string
  /** Marks the region busy while its content loads. */
  busy?: boolean
  orientation?: "horizontal" | "vertical" | "both"
  ref?: Ref<HTMLElement>
}

const overflows = (node: HTMLElement) =>
  node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight

/**
 * A named viewport for content wider or taller than its column, such as a static table or a
 * document preview. While its content overflows, the region joins the tab order so keyboard users
 * can focus and scroll it (WCAG 2.1.1); content that fits adds no empty tab stop.
 */
export function ScrollRegion({
  label,
  busy,
  orientation,
  className,
  children,
  ref,
  ...props
}: ScrollRegionProps) {
  const viewport = useRef<HTMLElement | null>(null)
  const composedRef = useComposedRefs(viewport, ref)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    const node = viewport.current
    if (!node) {
      return
    }
    const update = () => setScrollable(overflows(node))
    update()
    // The viewport's size changes with the layout; its content changes as rows and text arrive.
    const resize = new ResizeObserver(update)
    const content = new MutationObserver(update)
    resize.observe(node)
    content.observe(node, {
      characterData: true,
      childList: true,
      subtree: true,
    })
    return () => {
      content.disconnect()
      resize.disconnect()
    }
  }, [])

  return (
    <section
      aria-busy={busy}
      aria-label={label}
      className={scrollRegionVariants({ orientation, className })}
      ref={composedRef}
      tabIndex={scrollable ? 0 : undefined}
      {...props}
    >
      {children}
    </section>
  )
}

ScrollRegion.displayName = "ScrollRegion"
