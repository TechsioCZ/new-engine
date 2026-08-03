"use client"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { slugify } from "@techsio/ui-kit/utils"
import Image from "next/image"

import { StatsSection } from "@/components/stats-section"
import { aboutContent } from "@/data/about-content"

import aboutImage from "../../../assets/hero/about.webp"

export default function AboutPage() {
  const { hero, story, values, team } = aboutContent

  return (
    <>
      {/* Hero Section with Background Image */}
      <section className="relative flex h-about-hero-height items-center bg-center bg-cover md:h-about-hero-height-md">
        <Image alt="some" fill placeholder="blur" priority src={aboutImage} />

        <div className="absolute inset-0 bg-about-hero-overlay" />
        <div className="relative mx-auto max-w-container-max px-about-container-x text-center text-white md:px-about-container-x-md lg:px-about-container-x-lg">
          <h1 className="mb-about-hero-title-bottom font-about-hero-title text-5xl md:text-7xl">
            {hero.title}
          </h1>
          <p className="mx-auto max-w-about-hero-subtitle-max text-about-hero-subtitle-size opacity-90">
            {hero.subtitle}
          </p>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-about-section-y">
        <div className="mx-auto max-w-container-max px-about-container-x md:px-about-container-x-md lg:px-about-container-x-lg">
          <div className="grid grid-cols-1 items-center gap-about-story-gap lg:grid-cols-2">
            <div className="space-y-about-grid-item-gap">
              <h2 className="font-about-grid-title text-about-grid-title-fg text-about-grid-title-size">
                {story.title}
              </h2>
              {story.paragraphs.map((paragraph) => (
                <p
                  className="text-about-grid-text-fg text-about-grid-text-size leading-relaxed"
                  key={slugify(paragraph.slice(0, 50))}
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="overflow-hidden rounded-about-image-radius">
              <Image
                alt={story.imageAlt}
                height={600}
                objectFit="cover"
                src={story.image}
                width={800}
              />
            </div>
          </div>
        </div>
      </section>

      <StatsSection />

      {/* Values Section */}
      <section className="bg-about-values-section-bg py-about-section-y">
        <div className="mx-auto max-w-container-max px-about-container-x md:px-about-container-x-md lg:px-about-container-x-lg">
          <h2 className="mb-about-section-title-bottom text-center font-about-section-title text-about-section-title-fg text-about-section-title-size">
            {values.title}
          </h2>
          <div className="grid grid-cols-1 gap-about-values-gap sm:grid-cols-2 lg:grid-cols-3">
            {values.items.map((value) => (
              <div
                className="rounded-about-value border border-about-value-border bg-about-value-bg p-about-value-padding text-center transition-shadow hover:shadow-about-value-hover"
                key={slugify(value.title)}
              >
                <Icon className="text-3xl text-info" icon={value.icon} />
                <h3 className="mb-about-value-title-bottom font-about-value-title text-about-value-title-fg text-about-value-title-size">
                  {value.title}
                </h3>
                <p className="text-about-value-text-fg text-about-value-text-size">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-about-section-y">
        <div className="mx-auto max-w-container-max px-about-container-x md:px-about-container-x-md lg:px-about-container-x-lg">
          <h2 className="mb-about-section-title-bottom text-center font-about-section-title text-about-section-title-fg text-about-section-title-size">
            {team.title}
          </h2>
          <div className="grid grid-cols-1 place-items-center gap-about-team-gap sm:flex sm:justify-center">
            {team.members.map((member) => (
              <div
                className="group flex w-fit flex-col gap-200 text-center"
                key={slugify(member.name)}
              >
                <Image
                  alt={member.name}
                  className="shadow-primary"
                  height={200}
                  src={member.image}
                  width={200}
                />

                <article>
                  <h3 className="font-about-team-name text-about-team-name-fg text-about-team-name-size">
                    {member.name}
                  </h3>
                  <p className="text-about-team-role-fg text-about-team-role-size">
                    {member.role}
                  </p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
