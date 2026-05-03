import { resolveAfterAuthHref } from "@/components/auth/auth-helpers";
import { AuthControls } from "@/components/auth-controls";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const afterAuthHref = resolveAfterAuthHref(resolvedSearchParams.next);

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <AuthControls afterAuthHref={afterAuthHref} mode="login" />
    </main>
  );
}
