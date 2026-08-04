"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"
import { type SelectItem } from "@techsio/ui-kit/molecules/select"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import { slugify } from "@techsio/ui-kit/utils"
import Image from "next/image"

import { contactContent } from "@/data/contact-content"
import { useContactForm } from "@/hooks/use-contact-form"

import contactImage from "../../../assets/hero/contact.webp"

export default function ContactPage() {
  const { hero, form, info, help } = contactContent
  const { formData, updateField, handleSubmit, isSubmitting } = useContactForm()
  const subjectItems: SelectItem[] = form.subjects.map((subject) => ({
    label: subject.label,
    value: subject.value,
  }))

  return (
    <>
      {/* Hero Section */}
      <section className="relative flex h-about-hero-height items-center bg-center bg-cover md:h-about-hero-height-md">
        <Image
          alt="Naše kancelář"
          className="-z-1 brightness-60"
          fill
          objectFit="cover"
          placeholder="blur"
          priority={true}
          src={contactImage}
        />
        <div className="inset-0 mx-auto max-w-container-max px-container-x text-white">
          <div className="text-center">
            <h1 className="mb-contact-hero-title-bottom font-contact-hero-title text-contact-hero-title-size text-white">
              {hero.title}
            </h1>
            <p className="mx-auto max-w-contact-hero-subtitle-max text-contact-hero-subtitle-size text-white">
              {hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-contact-content-y" id="contact-form">
        <div className="mx-auto max-w-container-max px-container-x">
          <div className="grid grid-cols-1 gap-contact-grid-gap lg:grid-cols-3">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form
                className="grid rounded-contact-form bg-fill-base/20 p-contact-form-padding shadow-contact-form"
                onSubmit={handleSubmit}
              >
                <h2 className="mb-contact-form-title-bottom font-contact-form-title text-contact-form-title-fg text-contact-form-title-size">
                  {form.title}
                </h2>
                <div className="grid grid-cols-1 gap-contact-form-gap md:grid-cols-2">
                  <FormInput
                    id="firstName"
                    label={form.labels.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateField("firstName", e.target.value)
                    }
                    required
                    size="sm"
                    value={formData.firstName}
                  />
                  <FormInput
                    id="lastName"
                    label={form.labels.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateField("lastName", e.target.value)
                    }
                    required
                    size="sm"
                    value={formData.lastName}
                  />
                  <FormInput
                    id="email"
                    label={form.labels.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateField("email", e.target.value)
                    }
                    required
                    size="sm"
                    type="email"
                    value={formData.email}
                  />
                  <FormInput
                    id="phone"
                    label={form.labels.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateField("phone", e.target.value)
                    }
                    required
                    size="sm"
                    type="tel"
                    value={formData.phone}
                  />
                  <div className="space-y-contact-field-gap md:col-span-2">
                    <SelectTemplate
                      items={subjectItems}
                      label={form.labels.subject}
                      onValueChange={(details) =>
                        updateField("subject", details.value[0] || "general")
                      }
                      placeholder="Vyberte téma"
                      size="sm"
                      value={[formData.subject]}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormTextarea
                      id="message"
                      label={form.labels.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        updateField("message", e.target.value)
                      }
                      required
                      rows={6}
                      size="sm"
                      value={formData.message}
                    />
                  </div>
                </div>
                <Button
                  className="mt-6 place-self-end"
                  disabled={isSubmitting}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ? "Odesílám..." : form.labels.submit}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-contact-side-gap">
              {/* Contact Info Card */}
              <div className="rounded-contact-info border border-contact-info-border bg-contact-info-bg p-contact-info-padding">
                <h3 className="mb-contact-info-title-bottom font-contact-info-title text-contact-info-title-fg text-contact-info-title-size">
                  {info.title}
                </h3>
                {info.items.map((item) => (
                  <div
                    className="mb-contact-info-item-gap flex items-start space-x-contact-info-icon-gap"
                    key={slugify(item.label)}
                  >
                    <Icon
                      className="h-6 text-md"
                      icon={item.icon as IconType}
                    />
                    <div>
                      <p className="text-contact-info-text-fg text-contact-info-text-size">
                        {item.label}
                      </p>
                      {item.link ? (
                        <a
                          className="text-contact-info-link-fg transition-colors hover:text-contact-info-link-fg-hover"
                          href={item.link}
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="whitespace-pre-line text-contact-info-text-fg text-contact-info-text-size">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ Link */}
              <div className="rounded-contact-info border border-contact-info-border bg-contact-info-bg p-contact-info-padding">
                <h3 className="mb-contact-info-title-bottom font-contact-info-title text-contact-info-title-fg text-contact-info-title-size">
                  {help.title}
                </h3>
                <p className="text-contact-info-text-fg text-contact-info-text-size">
                  Hledáte rychlé odpovědi? Podívejte se na naše často kladené
                  otázky pro okamžitou pomoc.
                </p>
                <LinkButton
                  className="px-0 py-0 hover:bg-transparent"
                  href="/faq"
                  size="sm"
                  theme="borderless"
                >
                  <span className="underline">Často kladené dotazy</span>
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
