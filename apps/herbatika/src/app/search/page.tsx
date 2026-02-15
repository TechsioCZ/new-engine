import { Suspense } from "react";
import { StorefrontSearchResults } from "@/components/storefront-search-results";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <StorefrontSearchResults />
    </Suspense>
  );
}
