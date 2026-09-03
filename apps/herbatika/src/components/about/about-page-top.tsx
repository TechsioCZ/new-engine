import type { AboutPageData } from "./about-page.data"
import { AboutParagraphText } from "./about-page.shared"

export function AboutHero({ data }: { data: AboutPageData }) {
  return (
    <section className="max-w-5xl space-y-250">
      <h1 className="font-bold text-4xl text-fg-primary leading-tight lg:text-5xl">
        {data.hero.title}
      </h1>
      <AboutParagraphText paragraph={data.hero.lead} />
    </section>
  )
}
