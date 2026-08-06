export default function StorefrontNotFound() {
  return (
    <main className="mx-auto flex min-h-[50dvh] w-full max-w-max-w flex-col items-center justify-center gap-300 p-500 text-center">
      <p className="font-semibold text-fg-secondary text-sm">404</p>
      <h1 className="font-bold text-3xl text-fg-primary">Stránka sa nenašla</h1>
      <p className="max-w-prose text-fg-secondary">
        Požadovaná stránka neexistuje alebo už nie je dostupná.
      </p>
      <a className="font-semibold text-fg-link underline" href="/">
        Späť na domovskú stránku
      </a>
    </main>
  )
}
