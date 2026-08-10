"use client"
import { redirect } from "next/navigation"

import { ProfileForm } from "@/components/organisms/profile-form"
import { useAuth } from "@/hooks/use-auth"
import { useCustomer } from "@/hooks/use-customer"

const ProfilePage = () => {
  const { user, isLoading, isInitialized } = useAuth()

  const { address, isLoading: isAddressLoading } = useCustomer()

  if (isLoading || !isInitialized) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-primary border-b-2" />
          <p className="text-fg-secondary">Načítání...</p>
        </div>
      </div>
    )
  }

  if (user === null || user === undefined) {
    redirect("/auth/login")
  }

  let profileKey = "new"
  if (isAddressLoading) {
    profileKey = "loading"
  } else if (address !== null && address !== undefined) {
    profileKey = "exists"
  }

  return (
    <div className="mx-auto max-w-layout-max">
      <h1 className="mb-8 font-semibold text-2xl">Profil</h1>
      <ProfileForm initialAddress={address} key={profileKey} user={user} />
    </div>
  )
}

export default ProfilePage
