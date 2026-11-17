import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/sessoes', label: 'Sessões', icon: '⏱️' },
  { to: '/historico', label: 'Histórico', icon: '📅' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-4">
        <Outlet />
      </main>

      <nav
        className="grid grid-cols-3 border-t border-neutral-800 bg-neutral-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold ${
                isActive ? 'text-green-400' : 'text-neutral-400'
              }`
            }
          >
            <span className="text-2xl" aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
