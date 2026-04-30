import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb";
import { FaqAccordion } from "./faq-accordion";
import { faqItemCount, faqItems } from "./faq-page.data";

const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
  { label: "Domov", href: "/", icon: "token-icon-home" },
  { label: "Časté otázky" },
];

export function FaqPage() {
  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-550 lg:px-550 lg:py-700">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <section className="mx-auto w-full max-w-7xl space-y-500">
          <div className="space-y-400">
            <h1 className="text-4xl leading-tight font-bold text-fg-primary">
              Často kladené otázky
            </h1>
            <p className="font-verdana text-md leading-relaxed text-fg-secondary">
              Prehľad odpovedí z pôvodného Herbatica FAQ.
            </p>
          </div>
          <p className="font-verdana text-sm leading-normal text-fg-secondary">
            {faqItemCount} položiek celkom
          </p>

          <FaqAccordion items={faqItems} />
        </section>
      </div>
    </main>
  );
}
