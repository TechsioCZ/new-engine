import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { Input } from "../../src/atoms/input"
import { Link } from "../../src/atoms/link"
import { Footer } from "../../src/organisms/footer"

const meta: Meta<typeof Footer> = {
  title: "Organisms/Footer",
  component: Footer,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A flexible compound footer component with context-based sizing.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Footer>

export const Default: Story = {
  render: () => (
    <Footer>
      <Footer.Container>
        <Footer.Section>
          <Footer.Title>Company</Footer.Title>
          <Footer.Link href="/about">About Us</Footer.Link>
          <Footer.Link href="/team">Team</Footer.Link>
          <Footer.Link href="/careers">Careers</Footer.Link>
          <Footer.Link href="/contact">Contact</Footer.Link>
        </Footer.Section>

        <Footer.Section>
          <Footer.Title>Products</Footer.Title>
          <Footer.Link href="/features">Features</Footer.Link>
          <Footer.Link href="/pricing">Pricing</Footer.Link>
          <Footer.Link href="/enterprise">Enterprise</Footer.Link>
          <Footer.Link href="/changelog">Changelog</Footer.Link>
        </Footer.Section>

        <Footer.Section>
          <Footer.Title>Resources</Footer.Title>
          <Footer.Link href="/docs">Documentation</Footer.Link>
          <Footer.Link href="/blog">Blog</Footer.Link>
          <Footer.Link href="/guides">Guides</Footer.Link>
          <Footer.Link href="/api">API Reference</Footer.Link>
        </Footer.Section>

        <Footer.Section>
          <Footer.Title>Legal</Footer.Title>
          <Footer.Link href="/privacy">Privacy Policy</Footer.Link>
          <Footer.Link href="/terms">Terms of Service</Footer.Link>
          <Footer.Link href="/cookies">Cookie Policy</Footer.Link>
          <Footer.Text>© 2024 Company Inc.</Footer.Text>
        </Footer.Section>
      </Footer.Container>
    </Footer>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-400">
      <div className="border-border-primary border-t">
        <Footer size="sm">
          <Footer.Container>
            <Footer.Section>
              <Footer.Title>Products</Footer.Title>
              <Footer.Link href="/features">Features</Footer.Link>
              <Footer.Link href="/pricing">Pricing</Footer.Link>
              <Footer.Link href="/enterprise">Enterprise</Footer.Link>
              <Footer.Link href="/changelog">Changelog</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Company</Footer.Title>
              <Footer.Link href="/about">About Us</Footer.Link>
              <Footer.Link href="/careers">Careers</Footer.Link>
              <Footer.Link href="/blog">Blog</Footer.Link>
              <Footer.Link href="/press">Press</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Resources</Footer.Title>
              <Footer.Link href="/docs">Documentation</Footer.Link>
              <Footer.Link href="/support">Support</Footer.Link>
              <Footer.Link href="/api">API Status</Footer.Link>
              <Footer.Text>© 2024 Acme Inc.</Footer.Text>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Legal</Footer.Title>
              <Footer.Link href="/privacy">Privacy Policy</Footer.Link>
              <Footer.Link href="/terms">Terms of Service</Footer.Link>
              <Footer.Link href="/cookies">Cookie Policy</Footer.Link>
              <Footer.Link href="/gdpr">GDPR</Footer.Link>
            </Footer.Section>
          </Footer.Container>
        </Footer>
      </div>

      <div className="border-border-primary border-t">
        <Footer size="md">
          <Footer.Container>
            <Footer.Section>
              <Footer.Title>Products</Footer.Title>
              <Footer.Link href="/features">Features</Footer.Link>
              <Footer.Link href="/pricing">Pricing</Footer.Link>
              <Footer.Link href="/enterprise">Enterprise</Footer.Link>
              <Footer.Link href="/changelog">Changelog</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Company</Footer.Title>
              <Footer.Link href="/about">About Us</Footer.Link>
              <Footer.Link href="/careers">Careers</Footer.Link>
              <Footer.Link href="/blog">Blog</Footer.Link>
              <Footer.Link href="/press">Press</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Resources</Footer.Title>
              <Footer.Link href="/docs">Documentation</Footer.Link>
              <Footer.Link href="/support">Support</Footer.Link>
              <Footer.Link href="/api">API Status</Footer.Link>
              <Footer.Text>© 2024 Acme Inc.</Footer.Text>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Legal</Footer.Title>
              <Footer.Link href="/privacy">Privacy Policy</Footer.Link>
              <Footer.Link href="/terms">Terms of Service</Footer.Link>
              <Footer.Link href="/cookies">Cookie Policy</Footer.Link>
              <Footer.Link href="/gdpr">GDPR</Footer.Link>
            </Footer.Section>
          </Footer.Container>
        </Footer>
      </div>

      <div className="border-border-primary border-t">
        <Footer size="lg">
          <Footer.Container>
            <Footer.Section>
              <Footer.Title>Products</Footer.Title>
              <Footer.Link href="/features">Features</Footer.Link>
              <Footer.Link href="/pricing">Pricing</Footer.Link>
              <Footer.Link href="/enterprise">Enterprise</Footer.Link>
              <Footer.Link href="/changelog">Changelog</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Company</Footer.Title>
              <Footer.Link href="/about">About Us</Footer.Link>
              <Footer.Link href="/careers">Careers</Footer.Link>
              <Footer.Link href="/blog">Blog</Footer.Link>
              <Footer.Link href="/press">Press</Footer.Link>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Resources</Footer.Title>
              <Footer.Link href="/docs">Documentation</Footer.Link>
              <Footer.Link href="/support">Support</Footer.Link>
              <Footer.Link href="/api">API Status</Footer.Link>
              <Footer.Text>© 2024 Acme Inc.</Footer.Text>
            </Footer.Section>
            <Footer.Section>
              <Footer.Title>Legal</Footer.Title>
              <Footer.Link href="/privacy">Privacy Policy</Footer.Link>
              <Footer.Link href="/terms">Terms of Service</Footer.Link>
              <Footer.Link href="/cookies">Cookie Policy</Footer.Link>
              <Footer.Link href="/gdpr">GDPR</Footer.Link>
            </Footer.Section>
          </Footer.Container>
        </Footer>
      </div>
    </div>
  ),
}

export const Layouts: Story = {
  render: () => (
    <div className="flex flex-col gap-400">
      <div className="border-border-primary border-t">
        <Footer>
          <Footer.Container>
            <Footer.Section>
              <Footer.Title>Simple Layout</Footer.Title>
              <Footer.Link href="/home">Home</Footer.Link>
              <Footer.Link href="/about">About</Footer.Link>
              <Footer.Text>© 2024 Simple Company</Footer.Text>
            </Footer.Section>
          </Footer.Container>
        </Footer>
      </div>

      <div className="border-border-primary border-t">
        <Footer>
          <Footer.Container>
            <div className="grid grid-cols-1 gap-300 md:grid-cols-3">
              <Footer.Section>
                <Footer.Title>Company</Footer.Title>
                <Footer.Link href="/about">About</Footer.Link>
                <Footer.Link href="/team">Team</Footer.Link>
              </Footer.Section>

              <Footer.Section>
                <Footer.Title>Support</Footer.Title>
                <Footer.Link href="/help">Help Center</Footer.Link>
                <Footer.Link href="/contact">Contact</Footer.Link>
              </Footer.Section>

              <Footer.Section>
                <Footer.Title>Connect</Footer.Title>
                <Footer.Link href="https://twitter.com" external>
                  Twitter
                </Footer.Link>
                <Footer.Link href="https://github.com" external>
                  GitHub
                </Footer.Link>
                <Footer.Text>Follow us on social media</Footer.Text>
              </Footer.Section>
            </div>
          </Footer.Container>
        </Footer>
      </div>

      <div className="border-border-primary border-t">
        <Footer>
          <Footer.Container>
            <div className="flex flex-col gap-300">
              <div className="grid grid-cols-2 gap-300 md:grid-cols-4">
                <Footer.Section>
                  <Footer.Title>Product</Footer.Title>
                  <Footer.Link href="/features">Features</Footer.Link>
                  <Footer.Link href="/pricing">Pricing</Footer.Link>
                  <Footer.Link href="/security">Security</Footer.Link>
                </Footer.Section>

                <Footer.Section>
                  <Footer.Title>Company</Footer.Title>
                  <Footer.Link href="/about">About</Footer.Link>
                  <Footer.Link href="/blog">Blog</Footer.Link>
                  <Footer.Link href="/careers">Careers</Footer.Link>
                </Footer.Section>

                <Footer.Section>
                  <Footer.Title>Resources</Footer.Title>
                  <Footer.Link href="/docs">Docs</Footer.Link>
                  <Footer.Link href="/api">API</Footer.Link>
                  <Footer.Link href="/status">Status</Footer.Link>
                </Footer.Section>

                <Footer.Section>
                  <Footer.Title>Legal</Footer.Title>
                  <Footer.Link href="/privacy">Privacy</Footer.Link>
                  <Footer.Link href="/terms">Terms</Footer.Link>
                  <Footer.Link href="/cookies">Cookies</Footer.Link>
                </Footer.Section>
              </div>

              <div className="border-border-primary border-t pt-300">
                <Footer.Text>
                  © 2024 Company Inc. All rights reserved.
                </Footer.Text>
              </div>
            </div>
          </Footer.Container>
        </Footer>
      </div>
    </div>
  ),
}

// N1 Shop Footer
export const N1ShopFooter: Story = {
  render: () => (
    <Footer className="p-0" direction="vertical">
      <Footer.Container className="max-w-full p-400">
        {/* Company Info Section */}
        <Footer.Section>
          <Image
            src="https://www.n1shop.cz/data/upload/images/assets/logo-1.png"
            alt="N1 Shop Logo"
            className="mb-200 w-auto"
          />
          <div className="flex flex-col gap-200">
            <div className="flex items-start">
              <Icon
                icon="icon-[mdi--map-marker]"
                size="sm"
                className="mt-100 mr-200"
              />
              <div>
                <Footer.Text>N Distribution s. r. o.</Footer.Text>
                <Footer.Text className="text-xs">
                  Generála Šišky 1990/8, 143 00 Praha 4 - Modřany
                </Footer.Text>
              </div>
            </div>
            <Footer.Text>
              <Icon
                icon="icon-[mdi--phone]"
                size="sm"
                className="mr-200 inline-block"
              />
              +420 244 402 795
            </Footer.Text>
            <Footer.Link href="mailto:office@ndistribution.cz">
              <Icon
                icon="icon-[mdi--email]"
                size="sm"
                className="mr-200 inline-block"
              />
              office@ndistribution.cz
            </Footer.Link>
            <Footer.Text>
              <Icon
                icon="icon-[mdi--clock]"
                size="sm"
                className="mr-200 inline-block"
              />
              Po, Út, St, Čt, Pá: 8:00 - 17:00
            </Footer.Text>
          </div>
        </Footer.Section>

        {/* Business Terms Section */}
        <Footer.Section>
          <Footer.Title>Obchodní podmínky</Footer.Title>
          <Footer.List>
            <Footer.Link href="/zasady-ochrany">
              Zásady ochrany osobních údajů
            </Footer.Link>
            <Footer.Link href="/zpusoby-platby">Způsoby platby</Footer.Link>
            <Footer.Link href="/zpusoby-dopravy">Způsoby dopravy</Footer.Link>
            <Footer.Link href="/nastaveni-cookies">
              Nastavení cookies
            </Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Cookies Section */}
        <Footer.Section>
          <Footer.Title>Opětovné vyvolání cookies</Footer.Title>
        </Footer.Section>

        {/* News Section */}
        <Footer.Section>
          <Footer.Title>Novinky</Footer.Title>
        </Footer.Section>
      </Footer.Container>
      <Footer.Bottom className="bg-black">
        <Footer.Text>2025 COPYRIGHT N Distribution s.r.o.</Footer.Text>

        <div className="flex items-center gap-100">
          <Footer.Text>Tvorba eshopu:</Footer.Text>
          <Link href="https://webrevolution.cz" className="underline">
            Web Revolution
          </Link>
          <Image
            src="https://www.n1shop.cz/themes/default/img/wr.png"
            alt="Web Revolution"
          />
        </div>
      </Footer.Bottom>
    </Footer>
  ),
}

// Tailwind Varianta 1 - Footer with Brand and Social Icons
export const TailwindVarianta1: Story = {
  render: () => (
    <Footer className="p-0" direction="vertical">
      <Footer.Container className="max-w-full grid-cols-1 px-300 py-800 md:grid-cols-[300px_1fr_1fr_1fr_1fr]">
        {/* Brand Section */}
        <Footer.Section className="md:col-span-1">
          <Image
            src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
            alt="Company Logo"
            className="mb-300 size-400"
          />
          <Footer.Text className="mb-200">
            Making the world a better place through constructing elegant
            hierarchies.
          </Footer.Text>
          {/* Social Icons */}
          <Footer.List className="flex-row justify-around">
            <Footer.Link href="https://facebook.com" external>
              <Icon
                icon="icon-[mdi--facebook]"
                className="text-slate-400 hover:text-white"
                size="lg"
              />
            </Footer.Link>
            <Footer.Link href="https://instagram.com" external>
              <Icon
                icon="icon-[mdi--instagram]"
                className="text-slate-400 hover:text-white"
                size="lg"
              />
            </Footer.Link>
            <Footer.Link href="https://twitter.com" external>
              <Icon
                icon="icon-[mdi--twitter]"
                className="text-slate-400 hover:text-white"
                size="lg"
              />
            </Footer.Link>
            <Footer.Link href="https://github.com" external>
              <Icon
                icon="icon-[mdi--github]"
                className="text-slate-400 hover:text-white"
                size="lg"
              />
            </Footer.Link>
            <Footer.Link href="https://youtube.com" external>
              <Icon
                icon="icon-[mdi--youtube]"
                className="text-slate-400 hover:text-white"
                size="lg"
              />
            </Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Solutions Section */}
        <Footer.Section>
          <Footer.Title className="mb-300">Solutions</Footer.Title>
          <Footer.List>
            <Footer.Link href="/marketing">Marketing</Footer.Link>
            <Footer.Link href="/analytics">Analytics</Footer.Link>
            <Footer.Link href="/automation">Automation</Footer.Link>
            <Footer.Link href="/commerce">Commerce</Footer.Link>
            <Footer.Link href="/insights">Insights</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Support Section */}
        <Footer.Section>
          <Footer.Title className="mb-300">Support</Footer.Title>
          <Footer.List>
            <Footer.Link href="/submit-ticket">Submit ticket</Footer.Link>
            <Footer.Link href="/documentation">Documentation</Footer.Link>
            <Footer.Link href="/guides">Guides</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Company Section */}
        <Footer.Section>
          <Footer.Title className="mb-300">Company</Footer.Title>
          <Footer.List>
            <Footer.Link href="/about">About</Footer.Link>
            <Footer.Link href="/blog">Blog</Footer.Link>
            <Footer.Link href="/jobs">Jobs</Footer.Link>
            <Footer.Link href="/press">Press</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Legal Section */}
        <Footer.Section>
          <Footer.Title className="mb-300">Legal</Footer.Title>
          <Footer.List>
            <Footer.Link href="/terms">Terms of service</Footer.Link>
            <Footer.Link href="/privacy">Privacy policy</Footer.Link>
            <Footer.Link href="/license">License</Footer.Link>
          </Footer.List>
        </Footer.Section>
      </Footer.Container>

      <Footer.Divider className="py-0 my-0" />

      <Footer.Bottom className="py-300">
        <Footer.Text>
          © 2024 Your Company, Inc. All rights reserved.
        </Footer.Text>
      </Footer.Bottom>
    </Footer>
  ),
}

// Tailwind Varianta 2 - Footer with Newsletter
export const TailwindVarianta2: Story = {
  render: () => (
    <Footer className="p-0" direction="vertical">
      <Footer.Container className="max-w-full grid-cols-1 px-300 py-800 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {/* Solutions Section */}
        <Footer.Section>
          <Footer.Title>Solutions</Footer.Title>
          <Footer.List>
            <Footer.Link href="/marketing">Marketing</Footer.Link>
            <Footer.Link href="/analytics">Analytics</Footer.Link>
            <Footer.Link href="/automation">Automation</Footer.Link>
            <Footer.Link href="/commerce">Commerce</Footer.Link>
            <Footer.Link href="/insights">Insights</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Support Section */}
        <Footer.Section>
          <Footer.Title>Support</Footer.Title>
          <Footer.List>
            <Footer.Link href="/submit-ticket">Submit ticket</Footer.Link>
            <Footer.Link href="/documentation">Documentation</Footer.Link>
            <Footer.Link href="/guides">Guides</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Company Section */}
        <Footer.Section>
          <Footer.Title>Company</Footer.Title>
          <Footer.List>
            <Footer.Link href="/about">About</Footer.Link>
            <Footer.Link href="/blog">Blog</Footer.Link>
            <Footer.Link href="/jobs">Jobs</Footer.Link>
            <Footer.Link href="/press">Press</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Legal Section */}
        <Footer.Section>
          <Footer.Title>Legal</Footer.Title>
          <Footer.List>
            <Footer.Link href="/terms">Terms of service</Footer.Link>
            <Footer.Link href="/privacy">Privacy policy</Footer.Link>
            <Footer.Link href="/license">License</Footer.Link>
          </Footer.List>
        </Footer.Section>

        {/* Newsletter Section */}
        <Footer.Section>
          <Footer.Title>Subscribe to our newsletter</Footer.Title>
          <Footer.Text>
            The latest news, articles, and resources, sent to your inbox weekly.
          </Footer.Text>
          <div className="flex gap-200">
            <Input
              placeholder="Enter your email"
              className="py-100"
              size="sm"
            />
            <Button variant="primary" size="sm">
              Subscribe
            </Button>
          </div>
        </Footer.Section>
      </Footer.Container>

      <Footer.Divider className="py-0 my-0" />

      <Footer.Bottom>
        <Footer.Text>
          © 2024 Your Company, Inc. All rights reserved.
        </Footer.Text>

        {/* Social Icons */}
        <div className="flex gap-200">
          <Footer.Link href="https://facebook.com" external>
            <Icon
              icon="icon-[mdi--facebook]"
              className="text-gray-400 hover:text-white"
              size="lg"
            />
          </Footer.Link>
          <Footer.Link href="https://instagram.com" external>
            <Icon
              icon="icon-[mdi--instagram]"
              className="text-gray-400 hover:text-white"
              size="lg"
            />
          </Footer.Link>
          <Footer.Link href="https://twitter.com" external>
            <Icon
              icon="icon-[mdi--twitter]"
              className="text-gray-400 hover:text-white"
              size="lg"
            />
          </Footer.Link>
          <Footer.Link href="https://github.com" external>
            <Icon
              icon="icon-[mdi--github]"
              className="text-gray-400 hover:text-white"
              size="lg"
            />
          </Footer.Link>
          <Footer.Link href="https://youtube.com" external>
            <Icon
              icon="icon-[mdi--youtube]"
              className="text-gray-400 hover:text-white"
              size="lg"
            />
          </Footer.Link>
        </div>
      </Footer.Bottom>
    </Footer>
  ),
}
