import { HerbaticaLogo } from "@/components/herbatica-logo"

export function CheckoutFooter() {
  return (
    <footer className="w-full border-border-secondary border-t bg-surface">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-center px-400 py-700 lg:px-550">
        <HerbaticaLogo imageClassName="h-15" size="md" />
      </div>
    </footer>
  )
}
