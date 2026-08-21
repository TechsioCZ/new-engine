import { AccountSettings } from "@/components/account-settings"
import { AccountDeactivationSection } from "./account-deactivation-section"
import { AccountAddresses } from "./addresses/account-addresses"

export function AccountSettingsSections() {
  return (
    <div className="space-y-400">
      <AccountSettings />
      <AccountAddresses />
      <AccountDeactivationSection />
    </div>
  )
}
