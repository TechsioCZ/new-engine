import NextLink from "@/components/app-link"

import { ABOUT_PAGE } from "./about-page.data"

const iconLinkClassName =
  "inline-flex h-800 w-800 items-center justify-center rounded-full border border-border-secondary bg-surface text-fg-primary transition-colors hover:border-primary hover:bg-primary-light"

export const AboutSocialLinks = () => (
  <ul className="flex flex-wrap gap-150">
    {ABOUT_PAGE.socialLinks.map((link) => (
      <li key={link.href}>
        <NextLink
          aria-label={link.label}
          className={iconLinkClassName}
          href={link.href}
          rel="noreferrer noopener"
          target="_blank"
        >
          <span aria-hidden="true" className={`${link.icon} text-icon-lg`} />
        </NextLink>
      </li>
    ))}
  </ul>
)
