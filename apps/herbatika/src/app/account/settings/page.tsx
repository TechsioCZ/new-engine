import { AccountDeactivationSection } from "@/components/account/account-deactivation-section"
import { AccountSettings } from "@/components/account-settings"

export default function AccountSettingsPage() {
  return (
    <div className="space-y-400">
      <AccountSettings />
      <AccountDeactivationSection />
    </div>
  )
}
