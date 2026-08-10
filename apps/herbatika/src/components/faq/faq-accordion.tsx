"use client"

import { Accordion } from "@techsio/ui-kit/molecules/accordion"
import { useState } from "react"

import NextLink from "@/components/app-link"

import type {
  FaqAnswerBlock as FaqAnswerBlockData,
  FaqItem,
  FaqLink,
} from "./faq-page.data"

interface FaqAccordionProps {
  defaultValue?: string[]
  items: FaqItem[]
}

const answerTextClassName =
  "font-verdana text-md leading-relaxed text-fg-secondary"

const answerLinkClassName =
  "font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover"

const accordionContentClipClassName = "min-h-0 overflow-hidden"

const accordionContentBodyClassName = "space-y-300 py-450"

const isExternalHref = (href: string) =>
  href.startsWith("http") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:")

const FaqLinkItem = ({ href, label }: FaqLink) => {
  if (href.startsWith("http")) {
    return (
      <a
        className={answerLinkClassName}
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {label}
      </a>
    )
  }

  if (isExternalHref(href)) {
    return (
      <a className={answerLinkClassName} href={href}>
        {label}
      </a>
    )
  }

  return (
    <NextLink className={answerLinkClassName} href={href}>
      {label}
    </NextLink>
  )
}

const FaqAnswerBlockContent = ({ block }: { block: FaqAnswerBlockData }) => {
  if (block.type === "heading") {
    return (
      <h3 className="pt-100 font-bold text-fg-primary text-lg leading-snug">
        {block.text}
      </h3>
    )
  }

  if (block.type === "paragraph") {
    return <p className={answerTextClassName}>{block.text}</p>
  }

  if (block.type === "links") {
    return (
      <div className="flex flex-wrap items-center gap-300 pt-100">
        {block.items.map((link) => (
          <FaqLinkItem
            href={link.href}
            key={`${link.href}-${link.label}`}
            label={link.label}
          />
        ))}
      </div>
    )
  }

  const ListTag = block.ordered === true ? "ol" : "ul"
  const listClassName =
    block.ordered === true
      ? "ml-450 list-decimal space-y-150 font-verdana text-md leading-relaxed text-fg-secondary"
      : "ml-450 list-disc space-y-150 font-verdana text-md leading-relaxed text-fg-secondary"

  return (
    <ListTag className={listClassName}>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ListTag>
  )
}

const setAnimatedContentRef = (node: HTMLDivElement | null) => {
  node?.style.setProperty("display", "grid", "important")
}

export const FaqAccordion = ({ defaultValue, items }: FaqAccordionProps) => {
  const [openValue, setOpenValue] = useState<string[]>(defaultValue ?? [])
  const openItems = new Set(openValue)

  return (
    <Accordion
      className="gap-300 rounded-none bg-transparent"
      data-herbatika-faq-accordion=""
      multiple
      onChange={setOpenValue}
      size="md"
      value={openValue}
      variant="borderless"
    >
      {items.map((item) => {
        const isExpanded = openItems.has(item.id)

        return (
          <Accordion.Item
            className="overflow-hidden rounded-sm"
            key={item.id}
            value={item.id}
          >
            <Accordion.Header>
              <Accordion.Title className="px-450 py-450 font-bold font-verdana text-md leading-relaxed">
                {item.question}
              </Accordion.Title>
              <Accordion.Indicator iconSize="lg" />
            </Accordion.Header>

            <Accordion.Content
              inert={isExpanded ? undefined : true}
              ref={setAnimatedContentRef}
            >
              <div className={accordionContentClipClassName}>
                <div className={accordionContentBodyClassName}>
                  {item.answer.map((block, index) => (
                    <FaqAnswerBlockContent
                      block={block}
                      key={`${item.id}-${block.type}-${index}`}
                    />
                  ))}
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
}
