import NextImage, { type StaticImageData } from "next/image"

type BenefitItem = {
  id: number
  text: string
  description: string
  image: StaticImageData
}

type BenefitsSectionProps = {
  benefits: BenefitItem[]
}

export function BenefitsSection({ benefits }: BenefitsSectionProps) {
  return (
    <section className="rounded-lg bg-highlight-secondary px-450 py-350 font-verdana">
      <div className="grid gap-350 md:grid-cols-2 xl:grid-cols-4">
        {benefits.map((benefit) => (
          <article
            className="flex min-h-900 items-center gap-300"
            key={benefit.id}
          >
            <span className="flex h-850 w-850 shrink-0 items-center justify-center rounded-full">
              <NextImage
                alt={benefit.text}
                height={76}
                src={benefit.image}
                width={76}
              />
            </span>

            <p className="max-w-950 font-bold text-fg-primary text-support leading-snug">
              {benefit.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
