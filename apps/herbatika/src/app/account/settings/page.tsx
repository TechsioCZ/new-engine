import { AccountSettings } from "@/components/account-settings"
import { AccountDeactivationSection } from "@/components/account/account-deactivation-section"

const AccountSettingsPage = () => (
  <div className="space-y-400">
    <AccountSettings />
    <AccountDeactivationSection />
  </div>
)

export default AccountSettingsPage
