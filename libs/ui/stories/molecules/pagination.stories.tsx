import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Button } from '../../src/atoms/button'
import { Pagination } from '../../src/molecules/pagination'

const getStoryPageUrl = ({
  page,
  pageSize,
}: {
  page: number
  pageSize: number
}) => `#products?page=${page}&pageSize=${pageSize}`

const meta: Meta<typeof Pagination> = {
  title: 'Molecules/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    page: {
      control: { type: 'number', min: 1 },
      description: 'Current active page (controlled)',
    },
    defaultPage: {
      control: { type: 'number', min: 1 },
      description: 'Initial active page (uncontrolled)',
      defaultValue: 1,
    },
    count: {
      control: { type: 'number', min: 1 },
      description: 'Total number of items',
      defaultValue: 100,
    },
    pageSize: {
      control: { type: 'number', min: 1 },
      description: 'Number of items per page',
      defaultValue: 10,
    },
    siblingCount: {
      control: { type: 'number', min: 0 },
      description:
        'Number of sibling pages to show on each side of current page',
      defaultValue: 1,
    },
    boundaryCount: {
      control: { type: 'number', min: 0 },
      description: 'Number of boundary pages to always show at each end',
      defaultValue: 1,
    },
    variant: {
      control: 'select',
      options: ['filled', 'outlined', 'minimal'],
      description: 'Visual style variant',
      defaultValue: 'filled',
    },
    type: {
      control: 'radio',
      options: ['button', 'link'],
      description: 'Interaction mode: real buttons or real links',
      defaultValue: 'button',
    },
    getPageUrl: {
      control: false,
      description: 'Required when type is set to "link"',
    },
    showPrevNext: {
      control: 'boolean',
      description: 'Show previous/next page buttons',
      defaultValue: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof Pagination>

export const Default: Story = {
  args: {
    defaultPage: 5,
    count: 100,
    pageSize: 10,
    siblingCount: 1,
    variant: 'filled',
    showPrevNext: true,
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Small (sm)">
        <div className='space-y-300'>
          <Pagination 
            count={100} 
            pageSize={10} 
            defaultPage={5} 
            size="sm"
          variant="filled" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="sm"
          variant="outlined" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="sm"
          variant="minimal" 
        />
        </div>
      </VariantGroup>
      
      <VariantGroup title="Medium (md) - default">
        <div className='space-y-300'>
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="md"
          variant="filled" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="md"
          variant="outlined" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="md"
          variant="minimal" 
        />
        </div>
      </VariantGroup>
      
      <VariantGroup title="Large (lg)">
        <div className='space-y-300'>
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="lg"
          variant="filled" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
          size="lg"
          variant="outlined" 
        />
        <Pagination 
          count={100} 
          pageSize={10} 
          defaultPage={5} 
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
          <div>
            <p className="text-sm text-fg-secondary mb-100">Regular pagination:</p>
            <Pagination 
              count={250} 
              pageSize={10} 
              defaultPage={5} 
              variant="filled"
              compact={false}
            />
          </div>
          <div>
            <p className="text-sm text-fg-secondary mb-100">Compact mode:</p>
            <Pagination 
              count={250} 
              pageSize={10} 
              defaultPage={5} 
              variant="filled"
              compact={true}
            />
          </div>
        </div>
      </VariantGroup>

      <VariantGroup title="Compact with different variants">
        <Pagination 
          count={150} 
          pageSize={10} 
          defaultPage={8} 
          variant="filled"
          compact={true}
        />
        <Pagination 
          count={150} 
          pageSize={10} 
          defaultPage={8} 
          variant="outlined"
          compact={true}
        />
        <Pagination 
          count={150} 
          pageSize={10} 
          defaultPage={8} 
          variant="minimal"
          compact={true}
        />
      </VariantGroup>

      <VariantGroup title="Compact with sizes">
        <Pagination 
          count={200} 
          pageSize={10} 
          defaultPage={12} 
          size="sm"
          variant="filled"
          compact={true}
        />
        <Pagination 
          count={200} 
          pageSize={10} 
          defaultPage={12} 
          size="md"
          variant="filled"
          compact={true}
        />
        <Pagination 
          count={200} 
          pageSize={10} 
          defaultPage={12} 
          size="lg"
          variant="filled"
          compact={true}
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const StyleVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Default (Filled)">
        <Pagination
          defaultPage={5}
          count={100}
          pageSize={10}
          showPrevNext={true}
          variant="filled"
        />
      </VariantGroup>

      <VariantGroup title="Outlined">
        <Pagination
          defaultPage={5}
          count={100}
          pageSize={10}
          siblingCount={1}
          showPrevNext={true}
          variant="outlined"
        />
      </VariantGroup>

      <VariantGroup title="Minimal">
        <Pagination
          defaultPage={5}
          count={100}
          pageSize={10}
          siblingCount={1}
          showPrevNext={true}
          variant="minimal"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const EdgeCases: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Very few pages (1-3)">
        <div className="space-y-300">
          <Pagination count={5} pageSize={10} defaultPage={1} variant="filled" />
          <Pagination count={20} pageSize={10} defaultPage={1} variant="outlined" />
          <Pagination count={30} pageSize={10} defaultPage={2} variant="minimal" />
        </div>
      </VariantGroup>

      <VariantGroup title="Many pages (1000+ items)">
        <div className="space-y-300">
          <Pagination count={1000} pageSize={10} defaultPage={50} variant="filled" />
          <Pagination count={5000} pageSize={20} defaultPage={125} variant="outlined" />
        </div>
      </VariantGroup>

      <VariantGroup title="Different sibling counts">
        <div className="space-y-300">
          <div className="flex items-center gap-300">
            <span className="text-sm w-24">siblingCount=0</span>
            <Pagination count={200} pageSize={10} defaultPage={10} siblingCount={0} variant="filled" />
          </div>
          <div className="flex items-center gap-300">
            <span className="text-sm w-24">siblingCount=2</span>
            <Pagination count={200} pageSize={10} defaultPage={10} siblingCount={2} variant="filled" />
          </div>
          <div className="flex items-center gap-300">
            <span className="text-sm w-24">siblingCount=3</span>
            <Pagination count={200} pageSize={10} defaultPage={10} siblingCount={3} variant="filled" />
          </div>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    const totalItems = 250
    const pageSize = 10
    const totalPages = Math.ceil(totalItems / pageSize)
    
    const startItem = (page - 1) * pageSize + 1
    const endItem = Math.min(page * pageSize, totalItems)

    return (
      <div className="space-y-400">
        <div className="text-center space-y-150">
          <div className="text-lg font-medium">
            Page {page} of {totalPages}
          </div>
          <div className="text-sm text-fg-secondary">
            Showing items {startItem}-{endItem} of {totalItems}
          </div>
        </div>

        <Pagination
          page={page}
          count={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          variant="filled"
        />

        <div className="flex gap-150 justify-center">
          <Button
            onClick={() => setPage(1)}
            disabled={page === 1}
            size="sm"
            theme="outlined"
          >
            First
          </Button>
          <Button
            onClick={() => setPage(Math.max(1, page - 5))}
            disabled={page <= 5}
            size="sm"
            theme="outlined"
          >
            -5 Pages
          </Button>
          <Button
            onClick={() => setPage(Math.min(totalPages, page + 5))}
            disabled={page >= totalPages - 4}
            size="sm"
            theme="outlined"
          >
            +5 Pages
          </Button>
          <Button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            size="sm"
            theme="outlined"
          >
            Last
          </Button>
        </div>
      </div>
    )
  },
}

export const LinkMode: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="True link-based pagination">
        <div className="space-y-300">
          <p className="text-sm text-fg-secondary">
            Uses Zag link mode to generate real href values for each trigger.
          </p>
          <Pagination
            count={500}
            defaultPage={3}
            pageSize={20}
            type="link"
            getPageUrl={getStoryPageUrl}
            variant="filled"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Link mode with custom ranges">
        <Pagination
          count={500}
          boundaryCount={2}
          defaultPage={6}
          pageSize={20}
          siblingCount={2}
          type="link"
          getPageUrl={getStoryPageUrl}
          variant="outlined"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const RealWorldScenarios: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Table pagination (pageSize=20)">
        <div className="space-y-300">
          <div className="border rounded p-300 space-y-300">
            <div className="h-32 bg-surface rounded flex items-center justify-center text-sm text-fg-primary">
              Table content area
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fg-secondary">20 items per page</span>
              <Pagination count={456} pageSize={20} defaultPage={3} variant="filled" />
            </div>
          </div>
        </div>
      </VariantGroup>

      <VariantGroup title="Different page sizes">
        <div className="space-y-300">
          <div className="flex items-center gap-300">
            <span className="text-sm w-32">5 items/page</span>
            <Pagination count={100} pageSize={5} defaultPage={3} variant="outlined" />
          </div>
          <div className="flex items-center gap-300">
            <span className="text-sm w-32">25 items/page</span>
            <Pagination count={100} pageSize={25} defaultPage={2} variant="outlined" />
          </div>
          <div className="flex items-center gap-300">
            <span className="text-sm w-32">50 items/page</span>
            <Pagination count={100} pageSize={50} defaultPage={1} variant="outlined" />
          </div>
        </div>
      </VariantGroup>

      <VariantGroup title="Without prev/next buttons">
        <div className="space-y-300">
          <Pagination 
            count={150} 
            pageSize={10} 
            defaultPage={5} 
            showPrevNext={false} 
            variant="filled" 
          />
          <Pagination 
            count={150} 
            pageSize={10} 
            defaultPage={5} 
            showPrevNext={false} 
            variant="outlined" 
          />
          <Pagination 
            count={150} 
            pageSize={10} 
            defaultPage={5} 
            showPrevNext={false} 
            variant="minimal" 
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
