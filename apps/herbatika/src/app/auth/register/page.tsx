import { StorefrontAuthControls } from "@/components/storefront-auth-controls";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <StorefrontAuthControls mode="register" />
    </main>
  );
}
