import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS } from '../domain/labels'
import type { UserRole } from '../api/types'

const NAV: Array<{ to: string; label: string; roles?: UserRole[] }> = [
  { to: '/', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/engagements', label: 'Engagements' },
  { to: '/admin/clients', label: 'Clients', roles: ['admin'] },
  { to: '/admin/users', label: 'Users', roles: ['admin'] },
  { to: '/admin/service-types', label: 'Service types', roles: ['admin'] },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const visible = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)))

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <p className="px-2 text-sm font-semibold">Engagements</p>
        <nav className="mt-4 space-y-1">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-2 py-1.5 text-sm ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white
                           px-6 py-3">
          <span className="text-sm text-slate-600">
            {user?.full_name}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {user ? ROLE_LABELS[user.role] : ''}
            </span>
          </span>
          <button onClick={signOut} className="text-sm text-slate-600 hover:text-slate-900">
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
