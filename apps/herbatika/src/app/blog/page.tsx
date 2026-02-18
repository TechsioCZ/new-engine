import { connection } from "next/server";
import { Suspense } from "react";
import { BlogListingPage } from "@/components/blog/blog-listing-page";
import {
  resolveBlogListing,
  type BlogTopicKey,
} from "@/lib/storefront/blog-content";

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const parseTopic = (value: string | undefined): BlogTopicKey => {
  if (value === "fitness" || value === "krasa" || value === "zdravie") {
    return value;
  }

  return "all";
};

const parsePage = (value: string | undefined) => {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
};

function BlogPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function BlogPageContent({ searchParams }: BlogPageProps) {
  await connection();
  const resolvedSearchParams = await searchParams;
  const rawTopic = resolvedSearchParams.topic;
  const rawPage = resolvedSearchParams.page;

  const topic = parseTopic(Array.isArray(rawTopic) ? rawTopic[0] : rawTopic);
  const page = parsePage(Array.isArray(rawPage) ? rawPage[0] : rawPage);

  const listing = resolveBlogListing({ topic, page });

  return <BlogListingPage listing={listing} />;
}

export default function BlogPageRoute(props: BlogPageProps) {
  return (
    <Suspense fallback={<BlogPageFallback />}>
      <BlogPageContent {...props} />
    </Suspense>
  );
}
