import { Outlet } from '@modern-js/plugin-tanstack/runtime';
import './index.css';
import './ui-kit.css';

export default function Layout() {
  return (
    <div data-app-id="shell-super-app">
      <Outlet />
    </div>
  );
}
