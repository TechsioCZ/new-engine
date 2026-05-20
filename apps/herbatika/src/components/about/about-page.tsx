import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb";
import { routes } from "@/lib/routes";
import {
  AboutArticleSections,
  AboutClosingStatement,
  AboutCommunityAndReviews,
  AboutContact,
  AboutMilestones,
  AboutPrinciples,
} from "./about-page-sections";
import { AboutHero } from "./about-page-top";

const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
  { label: "Domov", href: routes.home, icon: "token-icon-home" },
  { label: "O nás" },
];

export function AboutPage() {
  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-about-page-gap p-about-page 2xl:p-about-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />
        <AboutHero />
        <AboutArticleSections group="beforeMilestones" />
        <AboutMilestones />
        <AboutArticleSections group="afterMilestones" />
        <AboutClosingStatement />
        <AboutPrinciples />
        <AboutCommunityAndReviews />
        <AboutContact />
      </div>
    </main>
  );
}
