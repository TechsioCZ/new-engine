import { ABOUT_PAGE } from "./about-page.data";
import { AboutParagraphText } from "./about-page.shared";

export function AboutHero() {
  return (
    <section className="max-w-5xl space-y-250">
      <h1 className="text-4xl leading-tight font-bold text-fg-primary lg:text-5xl">
        {ABOUT_PAGE.hero.title}
      </h1>
      <AboutParagraphText paragraph={ABOUT_PAGE.hero.lead} />
    </section>
  );
}
