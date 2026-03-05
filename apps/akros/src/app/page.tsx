export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-max-w flex-col gap-500 p-500">
      <section className="rounded-md border border-border-primary bg-surface p-500">
        <h1 className="text-2xl font-bold">Akros Token Setup</h1>
        <p className="mt-300 text-md text-fg-secondary">
          Základ aplikace je připravený: token pipeline, komponentové override
          soubory a kontrakt povolených variant pro UI komponenty.
        </p>
      </section>

      <section className="rounded-md border border-border-secondary bg-surface p-500">
        <h2 className="text-xl font-semibold">Další krok</h2>
        <p className="mt-300 text-md text-fg-secondary">
          Napojit konkrétní stránky podle Figma podkladů (header, footer, PDP,
          checkout, účet) nad tímto tokenovým základem.
        </p>
      </section>
    </main>
  )
}
