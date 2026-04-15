import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentPropsWithoutRef } from "react"
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

type StoryPaginationProps = Omit<PaginationProps, "getPageUrl">

function StoryPagination(props: StoryPaginationProps) {
  return <Pagination {...props} getPageUrl={getStoryPageUrl} />
}

type StoryLinkProps = ComponentPropsWithoutRef<"a"> & {
  replace?: boolean
}

function StoryLink({ replace, ...props }: StoryLinkProps) {
  return <a data-replace={replace ? "true" : undefined} {...props} />
}

const meta: Meta<typeof Pagination> = {
  title: "Molecules/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
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
      control: { type: "number", min: 1 },
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

export const Default: Story = {}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Small (sm)">
        <div className="space-y-300">
          <StoryPagination count={100} defaultPage={5} pageSize={10} size="sm" />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="sm"
            variant="outlined"
          />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="sm"
            variant="minimal"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Medium (md)">
        <div className="space-y-300">
          <StoryPagination count={100} defaultPage={5} pageSize={10} size="md" />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="md"
            variant="outlined"
          />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="md"
            variant="minimal"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Large (lg)">
        <div className="space-y-300">
          <StoryPagination count={100} defaultPage={5} pageSize={10} size="lg" />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="lg"
            variant="outlined"
          />
          <StoryPagination
            count={100}
            defaultPage={5}
            pageSize={10}
            size="lg"
            variant="minimal"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CompactMode: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Regular vs Compact">
        <div className="space-y-300">
          <StoryPagination count={250} defaultPage={5} pageSize={10} />
          <StoryPagination compact count={250} defaultPage={5} pageSize={10} />
        </div>
      </VariantGroup>

      <VariantGroup title="Compact with sizes">
        <StoryPagination
          compact
          count={200}
          defaultPage={12}
          pageSize={10}
          size="sm"
        />
        <StoryPagination
          compact
          count={200}
          defaultPage={12}
          pageSize={10}
          size="md"
        />
        <StoryPagination
          compact
          count={200}
          defaultPage={12}
          pageSize={10}
          size="lg"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const StyleVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Filled">
        <StoryPagination count={100} defaultPage={5} pageSize={10} />
      </VariantGroup>

      <VariantGroup title="Outlined">
        <StoryPagination
          count={100}
          defaultPage={5}
          pageSize={10}
          variant="outlined"
        />
      </VariantGroup>

      <VariantGroup title="Minimal">
        <StoryPagination
          count={100}
          defaultPage={5}
          pageSize={10}
          variant="minimal"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const EdgeCases: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Very few pages">
        <div className="space-y-300">
          <StoryPagination count={5} defaultPage={1} pageSize={10} />
          <StoryPagination
            count={20}
            defaultPage={1}
            pageSize={10}
            variant="outlined"
          />
          <StoryPagination
            count={30}
            defaultPage={2}
            pageSize={10}
            variant="minimal"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Many pages">
        <div className="space-y-300">
          <StoryPagination count={1000} defaultPage={50} pageSize={10} />
          <StoryPagination
            count={5000}
            defaultPage={125}
            pageSize={20}
            variant="outlined"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomLinkComponent: Story = {
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
  render: () => (
    <VariantContainer>
      <VariantGroup title="Table navigation">
        <div className="space-y-300">
          <div className="space-y-300 rounded border bg-base p-300">
            <div className="flex h-32 items-center justify-center rounded bg-surface text-fg-primary text-sm">
              Table content area
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary text-sm">20 items per page</span>
              <StoryPagination count={456} defaultPage={3} pageSize={20} />
            </div>
          </div>
        </div>
      </VariantGroup>

      <VariantGroup title="Without prev/next buttons">
        <div className="space-y-300">
          <StoryPagination
            count={150}
            defaultPage={5}
            pageSize={10}
            showPrevNext={false}
          />
          <StoryPagination
            count={150}
            defaultPage={5}
            pageSize={10}
            showPrevNext={false}
            variant="outlined"
          />
          <StoryPagination
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
