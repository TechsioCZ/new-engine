import { HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import { HerbatikaHomepage } from "@/components/herbatika-homepage";
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr";

function HomePageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function HomePageContent() {
  await connection();
  const { dehydratedState } = await prefetchHomePageStorefrontData();

  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage />
    </HydrationBoundary>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
