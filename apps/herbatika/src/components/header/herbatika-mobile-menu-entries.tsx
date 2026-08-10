"use client"

import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { Header, HeaderContext } from "@techsio/ui-kit/organisms/header"
import { useContext, useState } from "react"

import NextLink from "@/components/app-link"

import type { HerbatikaMobileMenuEntry } from "./herbatika-mobile-menu-model"

interface HerbatikaMobileMenuEntriesProps {
  initialExpandedValues: string[]
  mobileMenuEntries: readonly HerbatikaMobileMenuEntry[]
}

export const HerbatikaMobileMenuEntries = ({
  initialExpandedValues,
  mobileMenuEntries,
}: HerbatikaMobileMenuEntriesProps) => {
  const { setIsMobileMenuOpen } = useContext(HeaderContext)
  const [expandedValues, setExpandedValues] = useState(initialExpandedValues)

  const handleClose = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <Header.Nav className="w-full min-w-0 gap-y-0">
      <Accordion
        className="w-full"
        collapsible
        data-herbatika-mobile-menu-accordion=""
        multiple={false}
        onChange={setExpandedValues}
        size="md"
        value={expandedValues}
        variant="borderless"
      >
        {mobileMenuEntries.map((entry) =>
          entry.type === "group" ? (
            <Accordion.Item key={entry.href} value={entry.value}>
              <Accordion.Header>
                <Accordion.Title className="font-semibold">
                  <NextLink href={entry.href} onClick={handleClose}>
                    {entry.label}
                  </NextLink>
                </Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                <ul className="flex flex-col">
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      <NextLink
                        className="block border-border-secondary/40 px-350 py-150 text-sm hover:bg-surface hover:text-primary"
                        href={item.href}
                        onClick={handleClose}
                      >
                        {item.label}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          ) : (
            <Header.NavItem
              className="w-full min-w-0 border-border-secondary border-b bg-primary text-md hover:bg-accordion-bg-hover hover:text-fg-reverse"
              key={entry.href}
            >
              <NextLink
                className="block w-full min-w-0"
                href={entry.href}
                onClick={handleClose}
              >
                {entry.label}
              </NextLink>
            </Header.NavItem>
          ),
        )}
      </Accordion>
    </Header.Nav>
  )
}
