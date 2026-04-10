import { resolveAfterAuthHref } from "@/components/auth/storefront-auth-helpers";
import { StorefrontAuthControls } from "@/components/storefront-auth-controls";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const afterAuthHref = resolveAfterAuthHref(resolvedSearchParams.next);

  return (
    <main className="mx-auto w-full max-w-auth-content px-400 py-550 lg:px-550">
      <StorefrontAuthControls afterAuthHref={afterAuthHref} mode="register" />
    </main>
  );
}
