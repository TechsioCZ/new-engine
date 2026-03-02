import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { BenefitItem } from "@/components/homepage/homepage.data";

type HomepageBenefitsSectionProps = {
  benefits: BenefitItem[];
};

export function HomepageBenefitsSection({
  benefits,
}: HomepageBenefitsSectionProps) {
  return (
    <section className="rounded-lg bg-highlight px-450 py-350">
      <div className="grid gap-350 md:grid-cols-2 xl:grid-cols-4">
        {benefits.map((benefit) => (
          <article
            className="flex min-h-900 items-center gap-300"
            key={benefit.id}
          >
            <span className="flex h-800 w-800 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Icon className="text-4xl text-primary" icon={benefit.icon} />
            </span>

            <p className="max-w-950 text-sm leading-snug font-bold text-fg-primary">
              {benefit.title}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
