import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "storybook/test"
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  useEffect,
  useState,
} from "react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  Pagination,
  type PaginationProps,
} from "../../src/molecules/pagination"

const getStoryPageUrl = ({
  page,
  pageSize,
}: {
  page: number
  pageSize: number
}) => `#products?page=${page}&pageSize=${pageSize}`

type StoryPaginationProps = Omit<PaginationProps<ElementType>, "getPageUrl">

function StoryPagination({
  page: controlledPage,
  onPageChange,
  ...props
}: StoryPaginationProps) {
  const [page, setPage] = useState(controlledPage ?? props.defaultPage ?? 1)
  useEffect(() => {
    setPage(controlledPage ?? props.defaultPage ?? 1)
  }, [controlledPage, props.defaultPage])
  return (
    <Pagination
      {...props}
      page={page}
      getPageUrl={getStoryPageUrl}
      onPageChange={(next) => {
        setPage(next)
        onPageChange?.(next)
      }}
      onClick={(event) => {
        event.preventDefault()
        props.onClick?.(event)
      }}
    />
  )
}

type StoryLinkProps = ComponentPropsWithoutRef<"a"> & {
  replace?: boolean
}

function StoryLink({ replace, ...props }: StoryLinkProps) {
  return <a data-replace={replace ? "true" : undefined} {...props} />
}

const playgroundSource = `import { useState } from "react"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"

export function ProductPages() {
  const [page, setPage] = useState(5)
  return (
    <Pagination
      aria-label="Product pages"
      count={100}
      pageSize={10}
      page={page}
      onPageChange={setPage}
      getPageUrl={({ page, pageSize }) =>
        \`#products?page=\${page}&pageSize=\${pageSize}\`
      }
      variant="filled"
      size="md"
      onClick={(event) => event.preventDefault()}
    />
  )
}`

const meta: Meta<typeof Pagination> = {
  title: "Molecules/Pagination",
  component: Pagination,
  parameters: {
    docs: {
      description: {
        component:
          "A navigation landmark for moving through a paged collection with real destination URLs. Use it for long result sets; use Tabs for peer content panels or Steps for a sequential workflow. Unavailable destinations are non-interactive link placeholders; demos suppress real navigation.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div onClick={(event) => event.preventDefault()} role="presentation">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    page: {
      control: { type: "number", min: 1 },
      description: "Current active page (controlled)",
    },
    defaultPage: {
      control: { type: "number", min: 1 },
      description: "Initial active page (uncontrolled)",
      defaultValue: 1,
    },
    count: {
      control: { type: "number", min: 0 },
      description: "Total number of items",
      defaultValue: 100,
    },
    pageSize: {
      control: { type: "number", min: 1 },
      description: "Number of items per page",
      defaultValue: 10,
    },
    siblingCount: {
      control: { type: "number", min: 0 },
      description:
        "Number of sibling pages to show on each side of current page",
      defaultValue: 1,
    },
    boundaryCount: {
      control: { type: "number", min: 0 },
      description: "Number of boundary pages to always show at each end",
      defaultValue: 1,
    },
    getPageUrl: {
      control: false,
      description: "Required. Builds the href for each pagination trigger.",
    },
    linkAs: {
      control: false,
      description: "Optional custom link component used for navigable items.",
    },
    linkProps: {
      control: false,
      description:
        "Optional props forwarded to the custom link component. `href` remains owned by Pagination.",
    },
    variant: {
      control: "select",
      options: ["filled", "outlined", "minimal"],
      description: "Visual style variant",
      defaultValue: "filled",
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    compact: { control: "boolean" },
    showPrevNext: {
      control: "boolean",
      description: "Show previous/next page buttons",
      defaultValue: true,
    },
  },
  args: {
    defaultPage: 5,
    count: 100,
    pageSize: 10,
    siblingCount: 1,
    variant: "filled",
    showPrevNext: true,
    getPageUrl: getStoryPageUrl,
  },
}

export default meta
type Story = StoryObj<typeof Pagination>

export const Playground: Story = {
  parameters: {
    docs: {
      source: { code: playgroundSource, language: "tsx", type: "code" },
      description: {
        story:
          "Change paging controls and click page 6 to update the current page without navigating away.",
      },
    },
  },
  render: (args) => <StoryPagination {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const before = canvasElement.ownerDocument.location.href
    await userEvent.click(canvas.getByRole("link", { name: /^page 6$/ }))
    await expect(
      canvas.getByRole("link", { name: /^page 6$/ })
    ).toHaveAttribute("aria-current", "page")
    await expect(canvasElement.ownerDocument.location.href).toBe(before)
  },
}

export const StyleVariants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Filled, outlined and minimal navigation styles preserve the same destinations and current-page semantics.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Filled">
        <StoryPagination
          aria-label="Pagination, Filled 1"
          count={100}
          defaultPage={5}
          pageSize={10}
        />
      </VariantGroup>

      <VariantGroup title="Outlined">
        <StoryPagination
          aria-label="Pagination, Outlined 1"
          count={100}
          defaultPage={5}
          pageSize={10}
          variant="outlined"
        />
      </VariantGroup>

      <VariantGroup title="Minimal">
        <StoryPagination
          aria-label="Pagination, Minimal 1"
          count={100}
          defaultPage={5}
          pageSize={10}
          variant="minimal"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const nav of within(canvasElement).getAllByRole("navigation")) {
      const page = nav.querySelector('[data-part="item"]')
      const next = nav.querySelector('[data-part="next-trigger"]')
      if (!(page && next)) throw new Error("Missing pagination controls")
      await expect(getComputedStyle(page).fontSize).toBe(getComputedStyle(next).fontSize)
    }
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same five-page collection uses Small (sm), Medium (md) and Large (lg) shared control heights and interactive typography.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup
          key={size}
          title={
            { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
          }
        >
          <StoryPagination
            aria-label={`Project pages, ${size}`}
            count={50}
            defaultPage={3}
            pageSize={10}
            size={size}
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const Default: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A locally controlled results pager starts on page 5 and follows selected destinations.",
      },
    },
  },
  render: (args) => <StoryPagination {...args} />,
}

export const CompactMode: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compact paging shows the current page and total when a full page strip would be too wide.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Regular vs Compact">
        <div className="space-y-300">
          <StoryPagination
            aria-label="Pagination, Regular vs Compact 1"
            count={250}
            defaultPage={5}
            pageSize={10}
          />
          <StoryPagination
            aria-label="Pagination, Regular vs Compact 2"
            compact
            count={250}
            defaultPage={5}
            pageSize={10}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const EdgeCases: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Very short and long collections keep unavailable destinations non-interactive and meaningfully named.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: () => (
    <VariantContainer>
      <VariantGroup title="Very few pages">
        <div className="space-y-300">
          <StoryPagination
            aria-label="Pagination, Very few pages 1"
            count={5}
            defaultPage={1}
            pageSize={10}
          />
          <StoryPagination
            aria-label="Pagination, Very few pages 2"
            count={20}
            defaultPage={1}
            pageSize={10}
            variant="outlined"
          />
          <StoryPagination
            aria-label="Pagination, Very few pages 3"
            count={30}
            defaultPage={2}
            pageSize={10}
            variant="minimal"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Many pages">
        <div className="space-y-300">
          <StoryPagination
            aria-label="Pagination, Many pages 1"
            count={1000}
            defaultPage={50}
            pageSize={10}
          />
          <StoryPagination
            aria-label="Pagination, Many pages 2"
            count={5000}
            defaultPage={125}
            pageSize={20}
            variant="outlined"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const disabledLinks = canvasElement.querySelectorAll<HTMLElement>(
      '[role="link"][aria-disabled="true"]'
    )
    await expect(disabledLinks.length).toBeGreaterThan(0)
    const pageUrl = canvasElement.ownerDocument.location.href
    const selectedPages = Array.from(
      canvasElement.querySelectorAll('a[aria-current="page"]'),
      (element) => element.textContent
    )

    for (const link of disabledLinks) {
      const navigation = link.closest("nav")
      if (!navigation) {
        throw new Error("Pagination link must belong to a navigation landmark")
      }
      const name = link.getAttribute("aria-label")
      if (!name) {
        throw new Error("Disabled pagination link must have an accessible name")
      }
      await expect(within(navigation).getByRole("link", { name })).toBe(link)
      await expect(link).toHaveAttribute("aria-disabled", "true")
      await expect(link).not.toHaveAttribute("href")
      await expect(link).toHaveAttribute("tabindex", "-1")
      await expect(
        link.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        )
      ).toBe(false)
      await expect(canvasElement.ownerDocument.location.href).toBe(pageUrl)
      await expect(
        Array.from(
          canvasElement.querySelectorAll('a[aria-current="page"]'),
          (element) => element.textContent
        )
      ).toEqual(selectedPages)
    }
  },
}

export const CustomLinkComponent: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A routing adapter receives destination URLs while Pagination retains disabled and current-page semantics.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Custom polymorphic link">
        <div className="space-y-300">
          <p className="text-fg-secondary text-sm">
            `Pagination` stays navigation-only, but can forward extra props to a
            custom link component.
          </p>
          <Pagination
            count={500}
            defaultPage={6}
            pageSize={20}
            siblingCount={2}
            linkAs={StoryLink}
            linkProps={{ replace: true }}
            getPageUrl={getStoryPageUrl}
            variant="outlined"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const RealWorldScenarios: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare collection counts and page ranges in realistic results-navigation scenarios.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Table navigation">
        <div className="space-y-300">
          <div className="space-y-300 rounded border bg-base p-300">
            <div className="flex h-32 items-center justify-center rounded bg-surface text-fg-primary text-sm">
              Table content area
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary text-sm">
                20 items per page
              </span>
              <StoryPagination
                aria-label="Pagination, Table navigation 1"
                count={456}
                defaultPage={3}
                pageSize={20}
              />
            </div>
          </div>
        </div>
      </VariantGroup>

      <VariantGroup title="Without prev/next buttons">
        <div className="space-y-300">
          <StoryPagination
            aria-label="Pagination, Without prev/next buttons 1"
            count={150}
            defaultPage={5}
            pageSize={10}
            showPrevNext={false}
          />
          <StoryPagination
            aria-label="Pagination, Without prev/next buttons 2"
            count={150}
            defaultPage={5}
            pageSize={10}
            showPrevNext={false}
            variant="outlined"
          />
          <StoryPagination
            aria-label="Pagination, Without prev/next buttons 3"
            count={150}
            defaultPage={5}
            pageSize={10}
            showPrevNext={false}
            variant="minimal"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
