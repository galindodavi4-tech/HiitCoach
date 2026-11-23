import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Settings, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Wordmark from './jb/Wordmark';

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/sessoes', label: 'Sessões', icon: Timer },
  { to: '/historico', label: 'Histórico', icon: CalendarDays },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex h-full justify-center bg-[var(--jb-ink-900)]">
      <div className="flex h-full w-full max-w-[430px] flex-col bg-app">
        <main
          className="flex-1 overflow-y-auto px-[var(--screen-gutter)] pb-8"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}
        >
          <div className="mb-6 flex h-7 items-center">
            <Wordmark />
          </div>
          <Outlet />
        </main>

        {/* Fixed bottom tab bar: magenta when active */}
        <nav
          className="grid grid-cols-3 border-t border-line-subtle bg-app"
          style={{ boxShadow: 'var(--elev-dock)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-[var(--tabbar-height)] flex-col items-center justify-center gap-[5px] transition-colors duration-[140ms] ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                  <span
                    className={`text-[11px] tracking-[0.08em] uppercase ${isActive ? 'font-bold' : 'font-semibold'}`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
