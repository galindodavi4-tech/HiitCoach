import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, SlidersHorizontal, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Wordmark from './pulso/Wordmark';

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/sessoes', label: 'Sessões', icon: Timer },
  { to: '/historico', label: 'Histórico', icon: CalendarDays },
  { to: '/ajustes', label: 'Ajustes', icon: SlidersHorizontal },
];

export default function Layout() {
  return (
    <div className="flex h-full justify-center bg-[var(--surface-void)]">
      <div className="relative h-full w-full max-w-[430px] bg-app">
        <main
          className="h-full overflow-y-auto px-[var(--gutter)]"
          style={{
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
            // Content scrolls under the floating dock
            paddingBottom: 'calc(var(--tabbar-height) + var(--tabbar-inset) + 32px + env(safe-area-inset-bottom))',
          }}
        >
          <div className="mb-6 flex h-6 items-center">
            <Wordmark />
          </div>
          <Outlet />
        </main>

        {/* Floating capsule dock: the active tab expands into a volt pill with its label */}
        <nav
          className="absolute flex gap-1 rounded-full border border-line bg-surface-2 p-1.5"
          style={{
            left: 'var(--tabbar-inset)',
            right: 'var(--tabbar-inset)',
            bottom: 'calc(var(--tabbar-inset) + env(safe-area-inset-bottom))',
            height: 'var(--tabbar-height)',
            boxShadow: 'var(--shadow-dock)',
          }}
        >
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex min-w-0 items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-all duration-[240ms] ease-[cubic-bezier(.16,1,.3,1)] ${
                  isActive ? 'flex-[1_1_auto] bg-volt text-[var(--text-on-accent)]' : 'flex-[1_1_0] text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                  {isActive && <span className="whitespace-nowrap">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
