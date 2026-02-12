import { StorefrontAuthControls } from "@/components/storefront-auth-controls";

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <StorefrontAuthControls mode="both" />
    </main>
  );
}
