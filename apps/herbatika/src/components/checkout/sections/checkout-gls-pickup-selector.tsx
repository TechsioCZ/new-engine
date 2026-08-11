"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { storefrontSdk } from "@/lib/storefront/sdk"

type CheckoutGlsPickupSelectorProps = {
  cartId: string
  disabled: boolean
  onConfirm: (data: Record<string, unknown>) => void
}

type GLSBranch = {
  city: string
  country: string
  id: string
  name: string
  nameStreet: string
  street: string
  zip: string
}

type GLSBranchesResponse = {
  branches: GLSBranch[]
}

export function CheckoutGlsPickupSelector({
  cartId,
  disabled,
  onConfirm,
}: CheckoutGlsPickupSelectorProps) {
  const tCheckout = useTranslations("checkout")
  const [branches, setBranches] = useState<GLSBranch[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBranch, setSelectedBranch] = useState<GLSBranch | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const searchSequence = useRef(0)

  const handleSearch = async () => {
    const query = searchQuery.trim()
    if (!(query && cartId)) {
      return
    }

    const currentSearch = searchSequence.current + 1
    searchSequence.current = currentSearch

    setIsLoading(true)
    setHasFailed(false)

    try {
      const response = await storefrontSdk.client.fetch<GLSBranchesResponse>(
        "/store/gls/branches",
        {
          query: {
            cart_id: cartId,
            limit: 20,
            q: query,
          },
        }
      )

      if (currentSearch !== searchSequence.current) {
        return
      }
      if (!isGLSBranchesResponse(response)) {
        throw new Error("GLS pickup point search returned an invalid response")
      }

      setBranches(response.branches)
      setHasSearched(true)
    } catch (error) {
      if (currentSearch !== searchSequence.current) {
        return
      }

      console.error("GLS pickup point search failed", error)
      setBranches([])
      setHasFailed(true)
      setHasSearched(true)
    } finally {
      if (currentSearch === searchSequence.current) {
        setIsLoading(false)
      }
    }
  }

  const handleSelect = (branch: GLSBranch) => {
    setSelectedBranch(branch)
    onConfirm({
      access_point_id: branch.id,
      access_point_name: branch.name || branch.nameStreet || branch.id,
      access_point_street: branch.street || branch.nameStreet,
      access_point_city: branch.city,
      access_point_zip: branch.zip,
      access_point_country: branch.country,
    })
  }

  return (
    <div className="grid gap-150">
      {selectedBranch ? (
        <div className="grid gap-50">
          <p className="font-medium text-fg-primary text-sm">
            {tCheckout("selected_pickup_point", {
              pickupPointName:
                selectedBranch.name ||
                selectedBranch.nameStreet ||
                selectedBranch.id,
            })}
          </p>
          <p className="text-fg-secondary text-xs">
            {formatBranchAddress(selectedBranch)}
          </p>
        </div>
      ) : null}

      <FormInput
        disabled={disabled || isLoading || !cartId}
        id="checkout-gls-pickup-search"
        label={tCheckout("gls_pickup_search_label")}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            runDetachedPromise(handleSearch())
          }
        }}
        placeholder={tCheckout("gls_pickup_search_placeholder")}
        size="sm"
        value={searchQuery}
      />

      <Button
        disabled={disabled || isLoading || !cartId || !searchQuery.trim()}
        isLoading={isLoading}
        loadingText={tCheckout("gls_pickup_search_loading")}
        onClick={() => runDetachedPromise(handleSearch())}
        size="sm"
        type="button"
        variant="primary"
      >
        {tCheckout("gls_pickup_search_action")}
      </Button>

      {hasFailed ? (
        <div role="alert">
          <StatusText showIcon size="sm" status="error">
            {tCheckout("pickup_selector_unavailable")}
          </StatusText>
        </div>
      ) : null}

      {!hasFailed && hasSearched && branches.length === 0 ? (
        <output aria-live="polite">
          <StatusText size="sm" status="default">
            {tCheckout("gls_pickup_search_empty")}
          </StatusText>
        </output>
      ) : null}

      {branches.length > 0 ? (
        <ul aria-live="polite" className="grid list-none gap-100 p-0">
          {branches.map((branch) => (
            <li className="grid gap-50" key={branch.id}>
              <p className="font-medium text-fg-primary text-sm">
                {branch.name || branch.nameStreet || branch.id}
              </p>
              <p className="text-fg-secondary text-xs">
                {formatBranchAddress(branch)}
              </p>
              <Button
                aria-label={`${tCheckout("select_pickup_point")}: ${getBranchName(branch)}, ${formatBranchAddress(branch)}`}
                disabled={disabled}
                onClick={() => handleSelect(branch)}
                size="sm"
                theme="outlined"
                type="button"
                variant="secondary"
              >
                {tCheckout("select_pickup_point")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function formatBranchAddress(branch: GLSBranch) {
  return [branch.street || branch.nameStreet, branch.zip, branch.city]
    .filter(Boolean)
    .join(", ")
}

function getBranchName(branch: GLSBranch) {
  return branch.name || branch.nameStreet || branch.id
}

export function isGLSBranchesResponse(
  value: unknown
): value is GLSBranchesResponse {
  if (typeof value !== "object" || value === null || !("branches" in value)) {
    return false
  }

  const branches: unknown = value.branches
  return Array.isArray(branches) && branches.every(isGLSBranch)
}

function isGLSBranch(value: unknown): value is GLSBranch {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "nameStreet" in value &&
    typeof value.nameStreet === "string" &&
    "street" in value &&
    typeof value.street === "string" &&
    "city" in value &&
    typeof value.city === "string" &&
    "zip" in value &&
    typeof value.zip === "string" &&
    "country" in value &&
    typeof value.country === "string"
  )
}
