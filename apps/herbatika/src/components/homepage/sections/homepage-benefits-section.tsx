import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { BenefitItem } from "@/components/homepage/homepage.data";

type HomepageBenefitsSectionProps = {
  benefits: BenefitItem[];
};

export function HomepageBenefitsSection({
  benefits,
}: HomepageBenefitsSectionProps) {
  return (
    <section className="rounded-2xl border border-border-secondary bg-highlight p-300 md:p-400">
      <h2 className="mb-300 text-lg font-bold text-fg-primary">
        Čo vám Herbatika prináša
      </h2>
      <div className="grid grid-cols-2 gap-200 md:grid-cols-4 xl:grid-cols-8">
        {benefits.map((benefit) => (
          <article
            className="rounded-lg border border-border-secondary bg-surface px-300 py-300"
            key={benefit.id}
          >
            <Icon className="mb-200 text-2xl text-primary" icon={benefit.icon} />
            <p className="text-xs leading-tight font-bold text-fg-primary">
              {benefit.title}
            </p>
            <p className="mt-100 text-2xs leading-snug text-fg-secondary">
              {benefit.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
