import { HerbatikaLogo } from "@/components/herbatika-logo";

export function CheckoutFooter() {
  return (
    <footer className="w-full border-t border-border-secondary bg-surface">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-center px-400 py-700 lg:px-550">
        <HerbatikaLogo imageClassName="h-15" size="md" />
      </div>
    </footer>
  );
}
