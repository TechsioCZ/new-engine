"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { usePathname, useRouter } from "next/navigation"
import { useQueryState } from "nuqs"
import { useLogout } from "@/hooks/use-logout"
import { useAuthToast } from "@/hooks/use-toast"
import { resolveTab } from "@/lib/account-tabs"
import { parseAsAccountTab } from "@/lib/url-state/parsers"
import { AddressList } from "./_components/address-list"
import { OrderList } from "./_components/order-list"
import { ProfileForm } from "./_components/profile-form"

export default function ProfilePage() {
  const router = useRouter()
  const toast = useAuthToast()
  const [tabParam, setTabParam] = useQueryState("tab", parseAsAccountTab)
  const pathname = usePathname()
  const activeTab = resolveTab(tabParam, pathname)
  const logoutMutation = useLogout({
    onSuccess: () => {
      toast.logoutSuccess()
      router.push("/prihlaseni")
    },
    onError: () => {
      toast.logoutError()
    },
  })

  const handleTabChange = (value: string) => {
    const nextTab = resolveTab(value, pathname)
    void setTabParam(nextTab === "profile" ? null : nextTab, {
      history: "replace",
      scroll: false,
    })
  }

  return (
    <>
      <h1 className="mb-400 font-bold text-xl">Můj profil</h1>
      <Tabs
        className="hidden w-full gap-400 md:flex"
        onValueChange={handleTabChange}
        orientation="vertical"
        size="sm"
        value={activeTab}
        variant="default"
      >
        <Tabs.List className="flex w-full flex-col items-start gap-50 md:w-auto">
          <Tabs.Trigger value="profile">Osobní údaje</Tabs.Trigger>
          <Tabs.Trigger value="addresses">Adresy</Tabs.Trigger>
          <Tabs.Trigger value="orders">Objednávky</Tabs.Trigger>
          <Button
            className="justify-start"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            size="sm"
          >
            <span className="font-medium hover:underline">
              {logoutMutation.isPending ? "Odhlašuji..." : "Odhlásit se"}
            </span>
          </Button>
        </Tabs.List>

        <div className="min-w-0 flex-1">
          <Tabs.Content className="space-y-200 pt-0" value="profile">
            <h2 className="font-semibold text-lg">Osobní údaje</h2>
            <ProfileForm />
          </Tabs.Content>

          <Tabs.Content className="space-y-200 pt-0" value="addresses">
            <h2 className="font-semibold text-lg">Adresy</h2>
            <AddressList />
          </Tabs.Content>

          <Tabs.Content className="space-y-200 pt-0" value="orders">
            <h2 className="font-semibold text-lg">Objednávky</h2>
            <OrderList />
          </Tabs.Content>
        </div>
      </Tabs>
      <Tabs
        className="flex w-full gap-400 md:hidden"
        onValueChange={handleTabChange}
        orientation="horizontal"
        size="sm"
        value={activeTab}
        variant="default"
      >
        <Tabs.List className="flex w-full flex-col items-start gap-50 md:w-auto">
          <Tabs.Trigger value="profile">Osobní údaje</Tabs.Trigger>
          <Tabs.Trigger value="addresses">Adresy</Tabs.Trigger>
          <Tabs.Trigger value="orders">Objednávky</Tabs.Trigger>
          <Button
            className="justify-start"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            size="sm"
          >
            <span className="font-medium hover:underline">
              {logoutMutation.isPending ? "Odhlašuji..." : "Odhlásit se"}
            </span>
          </Button>
        </Tabs.List>

        <div className="min-w-0 flex-1">
          <Tabs.Content className="space-y-200 pt-0" value="profile">
            <h2 className="font-semibold text-lg">Osobní údaje</h2>
            <ProfileForm />
          </Tabs.Content>

          <Tabs.Content className="space-y-200 pt-0" value="addresses">
            <h2 className="font-semibold text-lg">Adresy</h2>
            <AddressList />
          </Tabs.Content>

          <Tabs.Content className="space-y-200 pt-0" value="orders">
            <h2 className="font-semibold text-lg">Objednávky</h2>
            <OrderList />
          </Tabs.Content>
        </div>
      </Tabs>
    </>
  )
}
