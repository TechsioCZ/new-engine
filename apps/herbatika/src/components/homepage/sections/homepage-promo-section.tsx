import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";

export function HomepagePromoSection() {
  return (
    <section className="grid gap-400 rounded-2xl border border-border-secondary bg-surface p-400 md:grid-cols-2 md:p-550">
      <div className="overflow-hidden rounded-2xl border border-border-secondary">
        <Image
          alt="Predajňa Herbatika"
          className="h-full min-h-950 w-full object-cover"
          src="https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1100&q=80"
        />
      </div>

      <div className="flex flex-col justify-center gap-300">
        <Badge
          className="w-fit rounded-full px-300 py-100 text-xs font-semibold"
          variant="secondary"
        >
          Spoja nás láska k prírode
        </Badge>
        <h2 className="text-2xl leading-tight font-bold text-fg-primary">
          Prírodná kozmetika, doplnky výživy a tradičná medicína
        </h2>
        <p className="text-sm leading-relaxed text-fg-secondary">
          Starostlivo vyberáme produkty, ktoré podporujú zdravie prirodzenou
          cestou. V ponuke nájdete výživové doplnky, bylinky aj kozmetiku pre
          každodennú rovnováhu.
        </p>
        <LinkButton
          as={NextLink}
          className="w-fit rounded-md px-400 py-200 font-semibold"
          href="/#"
          icon="icon-[mdi--arrow-right]"
          iconPosition="right"
          size="sm"
          variant="primary"
        >
          Objaviť ponuku
        </LinkButton>
      </div>
    </section>
  );
}
