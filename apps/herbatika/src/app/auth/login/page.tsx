import { resolveAfterAuthHref } from "@/components/auth/auth-helpers";
import { AuthControls } from "@/components/auth-controls";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const afterAuthHref = resolveAfterAuthHref(resolvedSearchParams.next);

  return (
    <main className="mx-auto w-full max-w-auth-content px-400 py-550 lg:px-550">
      <AuthControls afterAuthHref={afterAuthHref} mode="login" />
    </main>
  );
}
