import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BlogDetailPage } from "@/components/blog/blog-detail-page";
import {
  resolveBlogPostBySlug,
  resolveRelatedBlogPosts,
} from "@/lib/storefront/blog-content";

type BlogDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

function BlogDetailPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function BlogDetailPageContent({ params }: BlogDetailRouteProps) {
  await connection();
  const { slug } = await params;
  const post = resolveBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = resolveRelatedBlogPosts(post.slug, 4);

  return <BlogDetailPage post={post} relatedPosts={relatedPosts} />;
}

export default function BlogDetailPageRoute(props: BlogDetailRouteProps) {
  return (
    <Suspense fallback={<BlogDetailPageFallback />}>
      <BlogDetailPageContent {...props} />
    </Suspense>
  );
}
