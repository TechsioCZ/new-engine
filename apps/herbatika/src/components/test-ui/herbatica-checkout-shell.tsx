import type { ReactNode } from "react";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Steps } from "@techsio/ui-kit/molecules/steps";
import { HerbatikaLogo } from "@/components/herbatika-logo";
import { SupportingText } from "@/components/text/supporting-text";

const CHECKOUT_STEPS = [
  "Košík",
  "Doprava a platba",
  "Údaje",
  "Souhrn",
] as const;

type HerbaticaCheckoutShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  sidebar: ReactNode;
  step?: number;
  subtitle: string;
  title: string;
};

export function HerbaticaCheckoutShell({
  actions,
  children,
  sidebar,
  step = 2,
  subtitle,
  title,
}: HerbaticaCheckoutShellProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-secondary bg-base">
      <header className="border-b border-border-secondary bg-surface px-400 py-350">
        <div className="flex flex-wrap items-center justify-between gap-250">
          <div className="flex min-w-0 items-center gap-300">
            <HerbatikaLogo href="#" imageClassName="h-15" size="md" />
            <span className="hidden items-center gap-150 text-sm text-fg-primary sm:inline-flex">
              <Icon icon="icon-[mdi--shield-check-outline]" size="md" />
              Bezpečný nákup
            </span>
          </div>
          <Badge variant="secondary">checkout shell</Badge>
        </div>
      </header>

      <div className="border-b border-border-secondary bg-highlight px-400 py-350">
        <Steps
          count={CHECKOUT_STEPS.length}
          linear={false}
          orientation="horizontal"
          size="sm"
          step={step}
          variant="subtle"
        >
          <Steps.List>
            {CHECKOUT_STEPS.map((item, index) => (
              <Steps.Item index={index} key={item}>
                <Steps.Trigger disabled>
                  <Steps.Indicator />
                  <Steps.ItemText>
                    <Steps.Title>{item}</Steps.Title>
                  </Steps.ItemText>
                </Steps.Trigger>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>
        </Steps>
      </div>

      <div className="grid gap-300 px-400 py-400 xl:grid-cols-[minmax(0,1.65fr)_22rem]">
        <div className="space-y-300 rounded-2xl border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h3 className="text-xl font-semibold text-fg-primary">{title}</h3>
            <SupportingText>{subtitle}</SupportingText>
          </div>
          {children}
        </div>

        <aside className="space-y-250">{sidebar}</aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-200 border-t border-border-secondary bg-surface px-400 py-350">
        <LinkButton href="#" size="sm" theme="borderless" variant="secondary">
          Späť do košíka
        </LinkButton>
        {actions ?? (
          <Button size="sm" variant="primary">
            Pokračovať k souhrnu
          </Button>
        )}
      </footer>
    </section>
  );
}

type HerbaticaCheckoutSummaryPanelProps = {
  children?: ReactNode;
};

export function HerbaticaCheckoutSummaryPanel({
  children,
}: HerbaticaCheckoutSummaryPanelProps) {
  return (
    <div className="space-y-250 rounded-2xl border border-border-secondary bg-surface p-350">
      <div className="space-y-100">
        <div className="flex items-center justify-between gap-200">
          <h4 className="text-lg font-semibold text-fg-primary">Souhrn objednávky</h4>
          <Badge variant="outline">app</Badge>
        </div>
        <SupportingText>Kompaktní pravý panel z checkout flow.</SupportingText>
      </div>

      {children}
    </div>
  );
}

type HerbaticaCheckoutProductRecapProps = {
  price: string;
  quantity: string;
  title: string;
};

export function HerbaticaCheckoutProductRecap({
  price,
  quantity,
  title,
}: HerbaticaCheckoutProductRecapProps) {
  return (
    <div className="flex items-start gap-200 rounded-xl bg-highlight p-250">
      <div className="flex size-850 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
        <Image
          alt={title}
          className="h-full w-full object-cover"
          src="/photos/image.png"
        />
      </div>
      <div className="min-w-0 space-y-100">
        <p className="line-clamp-2 text-sm font-semibold text-fg-primary">{title}</p>
        <p className="text-xs text-fg-secondary">{quantity}</p>
        <p className="text-sm font-semibold text-fg-primary">{price}</p>
      </div>
    </div>
  );
}
