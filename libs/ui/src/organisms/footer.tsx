/*
 * Footer — @techsio/ui-kit organism.
 *
 * @component Footer
 * @componentVersion v1.0.2
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

type FooterVariants = VariantProps<typeof footerVariants>
type FooterSize = NonNullable<FooterVariants["size"]>
type FooterSectionFlow = NonNullable<FooterVariants["sectionFlow"]>
type FooterLayout = NonNullable<FooterVariants["layout"]>

const FooterSizeContext = createContext<FooterSize | undefined>(undefined)
const FooterSectionFlowContext = createContext<FooterSectionFlow | undefined>(
  undefined,
)
const FooterLayoutContext = createContext<FooterLayout | undefined>(undefined)

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

type FooterLinkRequirement<T extends ElementType> = T extends "a"
  ? {
      as?: never
      href: NonNullable<ComponentPropsWithoutRef<"a">["href"]>
    }
  : {
      as: Exclude<T, "a">
    }

type FooterLinkProps<T extends ElementType = "a"> = FooterLinkBaseProps &
  LinkProps<T> &
  FooterLinkRequirement<T>

interface FooterTextProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

interface FooterListProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode
}

type FooterDividerProps = HTMLAttributes<HTMLHRElement>

interface FooterBottomProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const FooterRoot = ({
  children,
  size,
  sectionFlow,
  direction,
  layout,
  className,
}: FooterProps) => {
  const { root } = footerVariants({ direction, size })

  return (
    <FooterSizeContext.Provider value={size}>
      <FooterSectionFlowContext.Provider value={sectionFlow}>
        <FooterLayoutContext.Provider value={layout}>
          <footer className={root({ className })}>{children}</footer>
        </FooterLayoutContext.Provider>
      </FooterSectionFlowContext.Provider>
    </FooterSizeContext.Provider>
  )
}

const FooterContainer = ({ children, className }: FooterContainerProps) => {
  const size = useContext(FooterSizeContext)
  const layout = useContext(FooterLayoutContext)
  const { container } = footerVariants({ layout, size })
  return <div className={container({ className })}>{children}</div>
}

const FooterSection = ({ children, className }: FooterSectionProps) => {
  const size = useContext(FooterSizeContext)
  const sectionFlow = useContext(FooterSectionFlowContext)
  const { section } = footerVariants({
    sectionFlow,
    size,
  })
  return <div className={section({ className })}>{children}</div>
}

const FooterTitle = ({ children, className }: FooterTitleProps) => {
  const size = useContext(FooterSizeContext)
  const { title } = footerVariants({ size })
  return <h3 className={title({ className })}>{children}</h3>
}

const FooterLink = <T extends ElementType = "a">(props: FooterLinkProps<T>) => {
  const size = useContext(FooterSizeContext)
  const { link } = footerVariants({ size })

  return <Link<T> {...props} className={link({ className: props.className })} />
}

const FooterText = ({ children, className }: FooterTextProps) => {
  const size = useContext(FooterSizeContext)
  const { text } = footerVariants({ size })
  return <p className={text({ className })}>{children}</p>
}

const FooterList = ({ children, className, ...props }: FooterListProps) => {
  const size = useContext(FooterSizeContext)
  const { list } = footerVariants({ size })
  return (
    <ul className={list({ className })} {...props}>
      {children}
    </ul>
  )
}

const FooterDivider = ({ className, ...props }: FooterDividerProps) => {
  const size = useContext(FooterSizeContext)
  const { divider } = footerVariants({ size })
  return <hr className={divider({ className })} {...props} />
}

const FooterBottom = ({ children, className, ...props }: FooterBottomProps) => {
  const size = useContext(FooterSizeContext)
  const { bottom } = footerVariants({ size })
  return (
    <div className={bottom({ className })} {...props}>
      {children}
    </div>
  )
}
FooterRoot.displayName = "Footer"

const FooterCompound = Object.assign(FooterRoot, {
  Bottom: FooterBottom,
  Container: FooterContainer,
  Divider: FooterDivider,
  Link: FooterLink,
  List: FooterList,
  Section: FooterSection,
  Text: FooterText,
  Title: FooterTitle,
})

export const Footer = FooterCompound
