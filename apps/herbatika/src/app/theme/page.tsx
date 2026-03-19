export default function Home() {
  return (
    <div className="min-h-screen p-500">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <header className="border-b pb-600">
          <h1 className="text-4xl font-bold">Herbatica Design Tokens</h1>
          <p className="mt-150 text-lg">
            Kompletní vizualizace design tokenů: Colors, Typography, Spacing, Radius & Shadows
          </p>
          <div className="mt-300 flex flex-wrap gap-150 text-sm text-fg-secondary">
            <span>📊 86+ tokens</span>
            <span>•</span>
            <span>🎨 40+ colors</span>
            <span>•</span>
            <span>📏 17 spacing</span>
            <span>•</span>
            <span>✏️ 18 typography</span>
            <span>•</span>
            <span>⚪ 5 radius</span>
            <span>•</span>
            <span>🌑 3 shadows</span>
          </div>
        </header>

        {/* Font Families */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Font Families</h2>
          <div className="grid gap-300">
            <div className="rounded border p-300">
              <div className="mb-150 text-sm text-fg-tertiary">
                --font-verdana (Primary, 71%)
              </div>
              <p className="font-verdana text-xl">
                Verdana - The quick brown fox jumps over the lazy dog
              </p>
              <p className="font-verdana text-xl font-bold">
                Verdana Bold - Přírodní produkty a čaje
              </p>
            </div>

            <div className="rounded border p-300">
              <div className="mb-150 text-sm text-fg-tertiary">
                --font-rubik (Secondary, 18%)
              </div>
              <p className="font-rubik text-xl">
                Rubik - The quick brown fox jumps over the lazy dog
              </p>
              <p className="font-rubik text-xl font-bold">
                Rubik Bold - Přírodní produkty a čaje
              </p>
            </div>

            <div className="rounded border p-300">
              <div className="mb-150 text-sm text-fg-tertiary">
                --font-sans / Open Sans (6%)
              </div>
              <p className="font-sans text-xl">
                Open Sans - The quick brown fox jumps over the lazy dog
              </p>
              <p className="font-sans text-xl font-bold">
                Open Sans Bold - Přírodní produkty a čaje
              </p>
            </div>

            <div className="rounded border p-300">
              <div className="mb-150 text-sm text-fg-tertiary">
                --font-roboto (6%)
              </div>
              <p className="font-roboto text-xl">
                Roboto - The quick brown fox jumps over the lazy dog
              </p>
              <p className="font-roboto text-xl font-bold">
                Roboto Bold - Přírodní produkty a čaje
              </p>
            </div>
          </div>
        </section>

        {/* Font Sizes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Font Sizes</h2>
          <div className="grid gap-200">
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-2xs</code>
              <span className="text-2xs">10px - Small text (0.625rem)</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-xs</code>
              <span className="text-xs">13px - Small text (0.8125rem) - 67× v Figma</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-sm</code>
              <span className="text-sm">14px - Navigation, menus (0.875rem) - 20× v Figma</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-md</code>
              <span className="text-md">16px - Body text (1rem) - 64× v Figma (MOST COMMON)</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-lg</code>
              <span className="text-lg">18px - Sections, headings (1.125rem)</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-xl</code>
              <span className="text-xl">20px - Large headings (1.25rem) - 3× v Figma</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-2xl</code>
              <span className="text-2xl">24px - Hero text (1.5rem) - 3× v Figma</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-3xl</code>
              <span className="text-3xl">28px - Very large (1.75rem) - 7× v Figma</span>
            </div>
            <div className="flex items-baseline gap-300 border-b pb-150">
              <code className="w-24 text-xs text-fg-tertiary">text-4xl</code>
              <span className="text-4xl">36px - Extra large (2.25rem) - 2× v Figma</span>
            </div>
          </div>
        </section>

        {/* Font Weights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Font Weights</h2>
          <div className="grid gap-200">
            <div className="flex items-baseline gap-300">
              <code className="w-32 text-xs text-fg-tertiary">font-normal</code>
              <span className="text-lg font-normal">Regular (400) - Standard text</span>
            </div>
            <div className="flex items-baseline gap-300">
              <code className="w-32 text-xs text-fg-tertiary">font-medium</code>
              <span className="text-lg font-medium">Medium (500) - Emphasized text</span>
            </div>
            <div className="flex items-baseline gap-300">
              <code className="w-32 text-xs text-fg-tertiary">font-semibold</code>
              <span className="text-lg font-semibold">Semibold (600) - Strong emphasis</span>
            </div>
            <div className="flex items-baseline gap-300">
              <code className="w-32 text-xs text-fg-tertiary">font-bold</code>
              <span className="text-lg font-bold">Bold (700) - Headings</span>
            </div>
          </div>
        </section>

        {/* Line Heights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Line Heights</h2>
          <div className="grid gap-300">
            <div>
              <code className="text-xs text-fg-tertiary">leading-tight (87.5%)</code>
              <p className="leading-tight border-l-4 border-border-primary pl-300 mt-150">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">leading-snug (112.5%)</code>
              <p className="leading-snug border-l-4 border-border-accent-primary pl-300 mt-150">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">leading-normal (137.5%)</code>
              <p className="leading-normal border-l-4 border-border-secondary pl-300 mt-150">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">leading-relaxed (150%)</code>
              <p className="leading-relaxed border-l-4 border-border-accent-secondary pl-300 mt-150">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">leading-loose (175%)</code>
              <p className="leading-loose border-l-4 border-border-tertiary pl-300 mt-150">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Spacing Tokens</h2>
          <div className="grid gap-150">
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-50</code>
              <div className="h-8 w-50 bg-primary"></div>
              <span className="text-sm">2px (0.125rem) - 11× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-150</code>
              <div className="h-8 w-150 bg-primary"></div>
              <span className="text-sm">4px (0.25rem) - 15× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-200</code>
              <div className="h-8 w-200 bg-primary"></div>
              <span className="text-sm">5px (0.3125rem) - 22× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-250</code>
              <div className="h-8 w-250 bg-primary"></div>
              <span className="text-sm">6px (0.375rem) - 10× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-300</code>
              <div className="h-8 w-300 bg-primary"></div>
              <span className="text-sm">8px (0.5rem) - 30× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-350</code>
              <div className="h-8 w-350 bg-secondary"></div>
              <span className="text-sm font-bold">10px (0.625rem) - 50× MOST COMMON</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-400</code>
              <div className="h-8 w-400 bg-primary"></div>
              <span className="text-sm">12px (0.75rem) - 4× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-450</code>
              <div className="h-8 w-450 bg-primary"></div>
              <span className="text-sm">14px (0.875rem) - 17× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-500</code>
              <div className="h-8 w-500 bg-primary"></div>
              <span className="text-sm">16px (1rem) - 14× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-550</code>
              <div className="h-8 w-550 bg-primary"></div>
              <span className="text-sm">18px (1.125rem) - 17× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-600</code>
              <div className="h-8 w-600 bg-secondary"></div>
              <span className="text-sm font-bold">20px (1.25rem) - 29× COMMON</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-650</code>
              <div className="h-8 w-650 bg-primary"></div>
              <span className="text-sm">28px (1.75rem) - 4× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-700</code>
              <div className="h-8 w-700 bg-primary"></div>
              <span className="text-sm">30px (1.875rem) - 3× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-750</code>
              <div className="h-8 w-750 bg-primary"></div>
              <span className="text-sm">40px (2.5rem) - 2× used</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-800</code>
              <div className="h-8 w-800 bg-herbatica-teal-2"></div>
              <span className="text-sm">76px (4.75rem) - Footer top</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-850</code>
              <div className="h-8 w-850 bg-herbatica-teal-2"></div>
              <span className="text-sm">100px (6.25rem) - Footer gap</span>
            </div>
            <div className="flex items-center gap-300">
              <code className="w-32 text-xs text-fg-tertiary">spacing-950</code>
              <div className="h-8 w-950 bg-herbatica-black-5"></div>
              <span className="text-sm">250px (15.625rem) - Container padding</span>
            </div>
          </div>
        </section>

        {/* Spacing Examples */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Spacing Examples</h2>
          <div className="grid gap-550">
            <div>
              <h3 className="text-lg font-bold mb-200">Gap spacing-350 (Most Common)</h3>
              <div className="flex gap-350 flex-wrap">
                <div className="h-12 w-24 bg-primary rounded"></div>
                <div className="h-12 w-24 bg-primary rounded"></div>
                <div className="h-12 w-24 bg-primary rounded"></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-200">Padding spacing-600 (Common)</h3>
              <div className="bg-base rounded p-600">
                <div className="bg-surface rounded p-300">Card with padding-600</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-200">Margin spacing-500</h3>
              <div className="bg-base p-300 rounded">
                <div className="bg-primary text-fg-reverse p-300 rounded mb-500">
                  First block
                </div>
                <div className="bg-secondary text-fg-reverse p-300 rounded">
                  Second block (margin-500 above)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette (Raw Colors) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Color Palette (Raw Colors)</h2>
          <div className="grid grid-cols-2 gap-300">
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-white"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-white</code>
                <p className="text-sm">#ffffff</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-white-2"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-white-2</code>
                <p className="text-sm">#f8f8f8</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-white-3"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-white-3</code>
                <p className="text-sm">#dddddd</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black</code>
                <p className="text-sm">#000000</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black-2"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black-2</code>
                <p className="text-sm">#4d4d4d</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black-3"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black-3</code>
                <p className="text-sm">#767676</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black-4"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black-4</code>
                <p className="text-sm">#333333</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black-5"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black-5</code>
                <p className="text-sm">#3b3a3c</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-black-6"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-black-6</code>
                <p className="text-sm">#dadada</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-teal"></div>
              <div>
                <code className="text-xs text-fg-tertiary font-bold">--herbatica-teal</code>
                <p className="text-sm font-bold">#009869 (Primary)</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-teal-2"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-teal-2</code>
                <p className="text-sm">#00a376</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-teal-3"></div>
              <div>
                <code className="text-xs text-fg-tertiary font-bold">--herbatica-teal-3</code>
                <p className="text-sm font-bold">#62BA46 (Secondary)</p>
              </div>
            </div>
            <div className="flex items-center gap-200">
              <div className="h-16 w-16 rounded border bg-herbatica-teal-4"></div>
              <div>
                <code className="text-xs text-fg-tertiary">--herbatica-teal-4</code>
                <p className="text-sm">#c3cbcc</p>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Primary Colors (Teal)</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-primary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-primary</code>
                <p className="text-sm">Base (#009869)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-primary-hover"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-primary-hover</code>
                <p className="text-sm">Hover state (OKLCH calculated)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-primary-active"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-primary-active</code>
                <p className="text-sm">Active/pressed state</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-primary-disabled"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-primary-disabled</code>
                <p className="text-sm">Disabled state</p>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Secondary Colors (Green)</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-secondary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-secondary</code>
                <p className="text-sm">Base (#62BA46)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-secondary-hover"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-secondary-hover</code>
                <p className="text-sm">Hover state</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-secondary-active"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-secondary-active</code>
                <p className="text-sm">Active/pressed state</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded bg-secondary-disabled"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-secondary-disabled</code>
                <p className="text-sm">Disabled state</p>
              </div>
            </div>
          </div>
        </section>

        {/* Foreground (Text) Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Foreground (Text) Colors</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border flex items-center justify-center text-fg-primary">
                <span className="font-bold">Aa</span>
              </div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-fg-primary</code>
                <p className="text-sm">Primary text (light-dark responsive)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border flex items-center justify-center text-fg-secondary">
                <span className="font-bold">Aa</span>
              </div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-fg-secondary</code>
                <p className="text-sm">Secondary text (#4d4d4d)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border flex items-center justify-center text-fg-tertiary">
                <span className="font-bold">Aa</span>
              </div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-fg-tertiary</code>
                <p className="text-sm">Tertiary text (#767676)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border flex items-center justify-center text-fg-accent-primary">
                <span className="font-bold">Aa</span>
              </div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-fg-accent-primary</code>
                <p className="text-sm">Accent text - Teal (#009869)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border flex items-center justify-center text-fg-accent-secondary">
                <span className="font-bold">Aa</span>
              </div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-fg-accent-secondary</code>
                <p className="text-sm">Accent text - Teal 2 (#00a376)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Background Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Background Colors</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border bg-base"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-base</code>
                <p className="text-sm">Base background (light-dark: #f8f8f8 / #333333)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border bg-surface"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-surface</code>
                <p className="text-sm">Surface/Card background (#ffffff)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Border Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Border Colors</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border-4 border-border-primary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-border-primary</code>
                <p className="text-sm">Primary border (#3b3a3c)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border-4 border-border-secondary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-border-secondary</code>
                <p className="text-sm">Secondary border (#dddddd)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border-4 border-border-tertiary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-border-tertiary</code>
                <p className="text-sm">Tertiary border (#dadada)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 rounded border-4 border-border-accent-primary"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--color-border-accent-primary</code>
                <p className="text-sm">Accent border - Teal (#009869)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Border Radius */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Border Radius</h2>
          <div className="grid gap-200">
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 bg-primary rounded-xs"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--radius-xs</code>
                <p className="text-sm">6px - Extra small radius</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 bg-primary rounded-sm"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--radius-sm</code>
                <p className="text-sm">8px - Small radius (buttons)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 bg-primary rounded-md"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--radius-md</code>
                <p className="text-sm">16px - Medium radius (cards)</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 bg-primary rounded-lg"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--radius-lg</code>
                <p className="text-sm">20px - Large radius</p>
              </div>
            </div>
            <div className="flex items-center gap-300">
              <div className="h-16 w-32 bg-primary rounded-xl"></div>
              <div className="flex-1">
                <code className="text-xs text-fg-tertiary">--radius-xl</code>
                <p className="text-sm">100px - Extra large radius (pills)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Shadows */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-150">Shadows</h2>
          <div className="grid gap-550">
            <div>
              <code className="text-xs text-fg-tertiary">--shadow-sm</code>
              <div className="mt-200 p-550 bg-surface rounded-lg shadow-sm">
                <p className="text-sm">Subtle shadow (0px 1px 3px rgba(0,0,0,0.04))</p>
                <p className="text-xs text-fg-tertiary mt-50">Use for: Dropdown menus, tooltips</p>
              </div>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">--shadow-md</code>
              <div className="mt-200 p-550 bg-surface rounded-lg shadow-md">
                <p className="text-sm">Medium shadow (0px 2px 6px rgba(0,0,0,0.02))</p>
                <p className="text-xs text-fg-tertiary mt-50">Use for: Cards, raised buttons</p>
              </div>
            </div>
            <div>
              <code className="text-xs text-fg-tertiary">--shadow-lg</code>
              <div className="mt-200 p-550 bg-surface rounded-lg shadow-lg">
                <p className="text-sm">Large shadow (0px 2px 6px rgba(0,0,0,0.25))</p>
                <p className="text-xs text-fg-tertiary mt-50">Use for: Modals, overlays, prominent elements</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
