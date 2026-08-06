const Loading = () => (
  <div
    aria-busy="true"
    aria-live="polite"
    className="flex min-h-screen items-center justify-center"
  >
    <p className="text-fg-secondary">Načítání produktu...</p>
  </div>
)

export default Loading
