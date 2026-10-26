import { Outlet } from '@modern-js/plugin-tanstack/runtime';
import { AppThemeProvider, BrandThemeScript } from '@techsio/ui-kit/theme/theme-provider';

import { AppShell } from '../components/app-shell/app-shell';
import { DEFAULT_BRAND, DEFAULT_MODE } from '../components/app-shell/theme';

import './ui-kit.css';
import './index.css';

// AppThemeProvider (better-themes) renders its pre-paint mode script during SSR
// only and returns null in the browser, which shifts every following sibling
// during hydration. A browser-only placeholder script takes its place so the
// server and client trees line up; its differing text is an expected mismatch.
function ModeScriptHydrationSlot() {
  return typeof document === 'undefined' ? null : (
    <script suppressHydrationWarning>{'/* theme mode script placeholder */'}</script>
  );
}

export default function Layout() {
  return (
    <AppThemeProvider defaultBrand={DEFAULT_BRAND} defaultMode={DEFAULT_MODE}>
      <ModeScriptHydrationSlot />
      <BrandThemeScript defaultBrand={DEFAULT_BRAND} />
      <div className="bg-base text-fg-primary" data-app-id="shell-super-app">
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </AppThemeProvider>
  );
}
