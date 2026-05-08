import { NavLink } from 'react-router-dom'

const links = [
  { to: '/sales',     label: 'Sales',     icon: '📈' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/roster',    label: 'Roster',    icon: '👥' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-wide">StoreMind</h1>
        <p className="text-xs text-gray-400 mt-0.5">Retail Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-500">
        Week 1 — MVP
      </div>
    </aside>
  )
}
