/**
 * Footer — @techsio/ui-kit organism.
 *
 * @component Footer
 * @componentVersion v1.0.0
 * @skill footer-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the footer-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, useContext } from "react"
import type {
  ComponentPropsWithoutRef,
  ElementType,
  HTMLAttributes,
  ReactNode,
} from "react"
import type { VariantProps } from "tailwind-variants"

import { Link } from "../atoms/link"
import type { LinkProps } from "../atoms/link"
import { tv } from "../utils"

const footerVariants = tv({
  defaultVariants: {
    direction: "horizontal",
    layout: "col",
    sectionFlow: "col",
    size: "md",
  },
  slots: {
    bottom:
      "flex w-full items-center justify-between border-t-(length:--border-footer-width) bg-footer-bottom-bg pt-footer-bottom",
    container: "w-full max-w-footer-max bg-footer-container-bg",
    divider: "flex h-footer-divider w-full border-0 bg-footer-divider-bg",
    link: "font-footer-link text-footer-link-fg transition-colors duration-200 motion-reduce:transition-none hover:text-footer-link-fg-hover",
    list: "flex list-none flex-col gap-footer-list bg-footer-list-bg",
    root: "flex w-full items-center justify-center rounded-footer bg-footer-bg",
    section: "bg-footer-section-bg",
    text: "text-footer-text-fg",
    title:
      "font-footer-title text-footer-title-fg transition-colors duration-200 motion-reduce:transition-none hover:text-footer-title-fg-hover",
  },
  variants: {
    direction: {
      horizontal: {
        root: "flex-row",
      },
      vertical: {
        root: "flex-col",
      },
    },
    layout: {
      col: {
        container: "grid grid-cols-(--footer-cols)",
      },
      row: {
        container: "flex flex-row",
      },
    },
    sectionFlow: {
      col: {
        section: "flex flex-col",
      },
      row: {
        section: "flex flex-row",
      },
    },
    size: {
      lg: {
        bottom: "p-footer-bottom-lg",
        container: "gap-footer-container-lg",
        divider: "my-footer-divider-lg",
        link: "text-footer-link-lg",
        list: "gap-footer-lg",
        root: "p-footer-lg",
        section: "gap-footer-section-lg",
        text: "text-footer-lg",
        title: "text-footer-title-lg",
      },
      md: {
        bottom: "p-footer-bottom-md",
        container: "gap-footer-container-md",
        divider: "my-footer-divider-md",
        link: "text-footer-link-md",
        list: "gap-footer-md",
        root: "p-footer-md",
        section: "gap-footer-section-md",
        text: "text-footer-md",
        title: "text-footer-title-md",
      },
      sm: {
        bottom: "p-footer-bottom-sm",
        container: "gap-footer-container-sm",
        divider: "my-footer-divider-sm",
        link: "text-footer-link-sm",
        list: "gap-footer-sm",
        root: "p-footer-sm",
        section: "gap-footer-section-sm",
        text: "text-footer-sm",
        title: "text-footer-title-sm",
      },
    },
  },
})

interface FooterContextValue {
  size?: "sm" | "md" | "lg" | undefined
  sectionFlow?: "col" | "row" | undefined
  layout?: "col" | "row" | undefined
}

const FooterContext = createContext<FooterContextValue>({})

interface FooterProps
  extends HTMLAttributes<HTMLElement>, VariantProps<typeof footerVariants> {
  children: ReactNode
}

interface FooterContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

interface FooterSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

interface FooterTitleProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

interface FooterLinkBaseProps {
  children: ReactNode
  external?: boolean | undefined
  className?: string | undefined
}

type FooterNativeLinkProps = FooterLinkBaseProps &
  Omit<
    ComponentPropsWithoutRef<"a">,
    keyof FooterLinkBaseProps | "as" | "href"
  > & {
    as?: never
    href: NonNullable<ComponentPropsWithoutRef<"a">["href"]>
  }

type FooterCustomLinkProps<T extends ElementType> = FooterLinkBaseProps &
  Omit<ComponentPropsWithoutRef<T>, keyof FooterLinkBaseProps | "as"> & {
    as: Exclude<T, "a">
  }

type FooterLinkProps<T extends ElementType = "a"> = T extends "a"
  ? FooterNativeLinkProps
  : FooterCustomLinkProps<T>

interface FooterTextProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

interface FooterListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode
}

interface FooterDividerProps extends HTMLAttributes<HTMLHRElement> {}

interface FooterBottomProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Footer({
  children,
  size,
  sectionFlow,
  direction,
  layout,
  className,
}: FooterProps) {
  const { root } = footerVariants({ direction, size })

  return (
    <FooterContext.Provider value={{ layout, sectionFlow, size }}>
      <footer className={root({ className })}>{children}</footer>
    </FooterContext.Provider>
  )
}

Footer.Container = function FooterContainer({
  children,
  className,
}: FooterContainerProps) {
  const { size, layout } = useContext(FooterContext)
  const { container } = footerVariants({ layout, size })
  return <div className={container({ className })}>{children}</div>
}

Footer.Section = function FooterSection({
  children,
  className,
}: FooterSectionProps) {
  const { size, sectionFlow } = useContext(FooterContext)
  const { section } = footerVariants({
    sectionFlow,
    size,
  })
  return <div className={section({ className })}>{children}</div>
}

Footer.Title = function FooterTitle({ children, className }: FooterTitleProps) {
  const { size } = useContext(FooterContext)
  const { title } = footerVariants({ size })
  return <h3 className={title({ className })}>{children}</h3>
}

function FooterLink(props: FooterNativeLinkProps): ReactNode
function FooterLink<T extends ElementType>(
  props: FooterCustomLinkProps<T>,
): ReactNode
function FooterLink<T extends ElementType = "a">({
  children,
  className,
  ...linkProps
}: FooterLinkProps<T>) {
  const { size } = useContext(FooterContext)
  const { link } = footerVariants({ size })

  return (
    <Link className={link({ className })} {...(linkProps as LinkProps<T>)}>
      {children}
    </Link>
  )
}

Footer.Link = FooterLink

Footer.Text = function FooterText({ children, className }: FooterTextProps) {
  const { size } = useContext(FooterContext)
  const { text } = footerVariants({ size })
  return <p className={text({ className })}>{children}</p>
}

Footer.List = function FooterList({
  children,
  className,
  ...props
}: FooterListProps) {
  const { size } = useContext(FooterContext)
  const { list } = footerVariants({ size })
  return (
    <ul className={list({ className })} {...props}>
      {children}
    </ul>
  )
}

Footer.Divider = function FooterDivider({
  className,
  ...props
}: FooterDividerProps) {
  const { size } = useContext(FooterContext)
  const { divider } = footerVariants({ size })
  return <hr className={divider({ className })} {...props} />
}

Footer.Bottom = function FooterBottom({
  children,
  className,
  ...props
}: FooterBottomProps) {
  const { size } = useContext(FooterContext)
  const { bottom } = footerVariants({ size })
  return (
    <div className={bottom({ className })} {...props}>
      {children}
    </div>
  )
}
