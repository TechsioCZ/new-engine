import { resolveAfterAuthHref } from "@/components/auth/auth-helpers";
import { AuthControls } from "@/components/auth-controls";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const afterAuthHref = resolveAfterAuthHref(resolvedSearchParams.next);

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <AuthControls afterAuthHref={afterAuthHref} mode="register" />
    </main>
  );
}
