export function StatsSection() {
  const stats = [
    {
      color: "primary",
      description: "Od roku 2008 budujeme úspěšné e-shopy",
      label: "let zkušeností",
      milestone: "První zákazník",
      value: "15+",
      year: "2008",
    },
    {
      color: "secondary",
      description: "Úspěšně dokončených e-commerce řešení",
      label: "realizovaných projektů",
      milestone: "První velký projekt",
      value: "200+",
      year: "2015",
    },
    {
      color: "success",
      description: "Vysoká míra spokojenosti a opakovaných zakázek",
      label: "dlouhodobých klientů",
      milestone: "Expansion program",
      value: "85%",
      year: "2020",
    },
    {
      color: "info",
      description: "Průměrné zvýšení tržeb prvním roce",
      label: "nárůst prodejů",
      milestone: "Optimization excellence",
      value: "40%",
      year: "2024",
    },
  ]

  return (
    <section className="bg-base px-[1.5rem] py-[4rem]">
      <div className="mx-auto max-w-[80rem]">
        {/* Header */}
        <div className="mb-[4rem] text-center">
          <h2 className="mb-[1rem] font-semibold text-[2.5rem] text-fg-primary leading-tight">
            Naše výsledky
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-[2rem] md:grid-cols-2 lg:grid-cols-4 lg:gap-[1rem]">
            {stats.map((stat, index) => {
              const colorClasses = {
                info: { bg: "bg-info", text: "text-info" },
                primary: { bg: "bg-primary", text: "text-primary" },
                secondary: { bg: "bg-secondary", text: "text-secondary" },
                success: { bg: "bg-success", text: "text-success" },
              }
              const colors =
                colorClasses[stat.color as keyof typeof colorClasses]

              return (
                <div className="relative" key={`stat-${stat.year}`}>
                  {/* Main content */}
                  <div className="relative flex h-[20rem] flex-col justify-between overflow-hidden rounded-[1rem] border border-border-subtle bg-fill-base/50 p-[2rem] text-center shadow-sm md:h-[22rem] lg:h-[20rem]">
                    {/* Top section */}
                    <div className="flex flex-1 flex-col justify-center">
                      {/* Value */}
                      <div
                        className={`mb-[0.75rem] font-bold text-[2.5rem] leading-none md:text-[3rem] ${colors.text}`}
                      >
                        {stat.value}
                      </div>

                      {/* Label */}
                      <h3 className="mb-[0.75rem] font-semibold text-[1rem] text-fg-primary leading-snug md:text-[1.125rem]">
                        {stat.label}
                      </h3>
                    </div>

                    {/* Bottom section */}
                    <div className="flex-shrink-0">
                      {/* Milestone */}
                      <p className="mb-[0.5rem] font-medium text-[0.875rem] text-fg-secondary">
                        {stat.milestone}
                      </p>

                      {/* Description */}
                      <p className="text-[0.75rem] text-fg-tertiary leading-relaxed md:text-[0.875rem]">
                        {stat.description}
                      </p>
                    </div>

                    {/* Bottom accent line */}
                    <div
                      className={`-bottom-1 absolute right-0 left-0 h-[0.5rem] rounded-b-[1rem] ${colors.bg} opacity-20`}
                    />
                  </div>

                  {/* Connection line for mobile */}
                  {index < stats.length - 1 && (
                    <div className="mt-[1rem] mb-[1rem] flex justify-center lg:hidden">
                      <div className="h-[2rem] w-[0.125rem] bg-border-subtle" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-[4rem] text-center">
          <div className="inline-flex items-center gap-[0.75rem] rounded-full border border-border-subtle bg-surface px-[2rem] py-[1rem]">
            <div className="h-[0.5rem] w-[0.5rem] animate-pulse rounded-full bg-secondary" />
            <span className="font-medium text-[0.875rem] text-fg-secondary">
              Pokračujeme v růstu každý den
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
