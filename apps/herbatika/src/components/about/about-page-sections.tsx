import NextLink from "next/link"
import { Fragment } from "react"
import { ABOUT_PAGE } from "./about-page.data"
import {
  AboutImageFrame,
  AboutParagraphText,
  aboutParagraphClassName,
  SectionHeader,
} from "./about-page.shared"
import { AboutReviewRating } from "./about-review-rating"

const iconLinkClassName =
  "inline-flex h-800 w-800 items-center justify-center rounded-full border border-border-secondary bg-surface text-fg-primary transition-colors hover:border-primary hover:bg-primary-light"

function AboutLogoMeaning() {
  return (
    <section className="border-border-secondary border-t pt-650">
      <div className="max-w-5xl border-primary border-l-4 pl-400">
        {ABOUT_PAGE.logoMeaning.paragraphs.map((paragraph, index) => (
          <AboutParagraphText
            key={`logo-meaning-${index}`}
            paragraph={paragraph}
          />
        ))}
      </div>
    </section>
  )
}

export function AboutArticleSections({
  group = "beforeMilestones",
}: {
  group?: "afterMilestones" | "beforeMilestones"
}) {
  const sections =
    group === "beforeMilestones"
      ? ABOUT_PAGE.sections.slice(0, 3)
      : ABOUT_PAGE.sections.slice(3)

  return (
    <div className="space-y-650">
      {sections.map((section, index) => (
        <Fragment key={section.title}>
          <section className="grid gap-500 border-border-secondary border-t pt-650 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)] lg:items-start">
            <div className="max-w-5xl space-y-300">
              <SectionHeader title={section.title} />
              <div className="space-y-300">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <AboutParagraphText
                    key={`${section.title}-${paragraphIndex}`}
                    paragraph={paragraph}
                  />
                ))}
              </div>
            </div>

            {section.image ? <AboutImageFrame image={section.image} /> : null}
          </section>

          {group === "beforeMilestones" && index === 0 ? (
            <AboutLogoMeaning />
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

export function AboutMilestones() {
  return (
    <section className="space-y-400 border-border-secondary border-t pt-650">
      <SectionHeader title="Kľúčové míľniky našej histórie" />
      <ol className="space-y-250">
        {ABOUT_PAGE.milestones.map((milestone, index) => (
          <li
            className="grid gap-150 border-border-secondary border-t py-250 first:border-t-0 sm:grid-cols-[5rem_minmax(0,1fr)]"
            key={`${milestone.year}-${index}`}
          >
            <p className="font-bold text-primary text-xl leading-tight">
              {milestone.year}
            </p>
            <AboutParagraphText paragraph={milestone.description} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AboutClosingStatement() {
  return (
    <p className="mx-auto max-w-5xl text-center font-bold text-2xl text-primary leading-snug">
      {ABOUT_PAGE.closingStatement}
    </p>
  )
}

export function AboutPrinciples() {
  return (
    <section className="grid gap-500 border-border-secondary border-t pt-650 md:grid-cols-3">
      {ABOUT_PAGE.principles.map((principle) => (
        <article className="space-y-250" key={principle.title}>
          <h2 className="flex items-center gap-200 font-bold text-2xl text-fg-primary leading-tight">
            <span
              aria-hidden="true"
              className="token-icon-leaf text-icon-lg text-primary"
            />
            {principle.title}
          </h2>
          <p className={aboutParagraphClassName}>{principle.description}</p>
        </article>
      ))}
    </section>
  )
}

function AboutSocialLinks() {
  return (
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
}

export function AboutCommunityAndReviews() {
  return (
    <div className="space-y-650 border-border-secondary border-t pt-650">
      <div className="grid gap-500 lg:grid-cols-2">
        <div className="space-y-300">
          {ABOUT_PAGE.follow.paragraphs.map((paragraph, index) => (
            <AboutParagraphText key={`follow-${index}`} paragraph={paragraph} />
          ))}
          <AboutSocialLinks />
        </div>

        <div className="space-y-300">
          {ABOUT_PAGE.loyalty.paragraphs.map((paragraph, index) => (
            <AboutParagraphText
              key={`loyalty-${index}`}
              paragraph={paragraph}
            />
          ))}
        </div>
      </div>

      <section className="space-y-300">
        <SectionHeader title={ABOUT_PAGE.reviews.title} />
        {ABOUT_PAGE.reviews.paragraphs.map((paragraph, index) => (
          <AboutParagraphText key={`reviews-${index}`} paragraph={paragraph} />
        ))}
        <AboutReviewRating />
      </section>
    </div>
  )
}

export function AboutContact() {
  return (
    <section className="grid gap-500 border-border-secondary border-t pt-650 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
      <div className="space-y-350">
        <SectionHeader title={ABOUT_PAGE.contact.title} />
        <div className="space-y-300">
          {ABOUT_PAGE.contact.paragraphs.map((paragraph, index) => (
            <AboutParagraphText
              key={`contact-${index}`}
              paragraph={paragraph}
            />
          ))}
        </div>
      </div>

      <address className="not-italic">
        <h3 className="mb-250 font-bold text-fg-primary text-lg leading-tight">
          Prevádzkovateľ internetového obchodu
        </h3>
        <ul className="space-y-100 font-verdana text-fg-secondary text-md leading-relaxed">
          {ABOUT_PAGE.contact.companyDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </address>
    </section>
  )
}
