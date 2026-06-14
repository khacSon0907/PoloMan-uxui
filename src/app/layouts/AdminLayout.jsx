import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { tokenStorage } from '../../shared/api'

const adminNavItems = [
  { to: '/admin', label: 'Tong quan', shortLabel: 'TQ' },
  { to: '/admin/categories', label: 'Danh muc', shortLabel: 'DM' },
  { to: '/admin/products', label: 'San pham', shortLabel: 'SP' },
  { to: '/admin/banners', label: 'Banner', shortLabel: 'BN' },
  { to: '/admin/promotion-banners', label: 'Promotion', shortLabel: 'PR' },
  { to: '/admin/orders', label: 'Don hang', shortLabel: 'DH' },
  { to: '/admin/users', label: 'Khach hang', shortLabel: 'KH' },
  { to: '/admin/roles', label: 'Roles', shortLabel: 'RL' },
]

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Admin'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'A'
}

function AdminLayout() {
  const navigate = useNavigate()
  const user = tokenStorage.getUser()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = async () => {
    await authApi.logout()
    navigate('/login', {
      replace: true,
      state: {
        successMessage: 'Dang xuat thanh cong.',
      },
    })
  }

  return (
    <div className="min-h-screen bg-emerald-50/45 text-neutral-950">
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-emerald-900/20 bg-[#052f25] text-white shadow-2xl transition-all duration-300 lg:flex lg:flex-col ${
          sidebarCollapsed ? 'w-24' : 'w-72'
        }`}
      >
        <div className="px-5 pb-5 pt-6">
          <Link
            to="/admin"
            className={`flex items-center rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-inner shadow-white/5 ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-lg font-black text-emerald-950">
              P
            </span>
            <span className={`min-w-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <span className="block text-xl font-light tracking-[0.24em] uppercase text-white">
                POLOMAN
              </span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                Admin console
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <p
            className={`px-3 pb-3 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/45 ${
              sidebarCollapsed ? 'text-center' : ''
            }`}
          >
            {sidebarCollapsed ? 'QL' : 'Quan ly'}
          </p>
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `group relative flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold transition-all ${
                  sidebarCollapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive
                    ? 'bg-white text-emerald-950 shadow-lg shadow-black/15'
                    : 'text-emerald-50/75 hover:bg-white/[0.08] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white/[0.08] text-emerald-100 group-hover:bg-white/[0.14]'
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                  <span className={`flex-1 ${sidebarCollapsed ? 'hidden' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && !sidebarCollapsed && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`m-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
          <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">
            Storefront
          </p>
          <Link
            to="/"
            className="mt-3 flex h-11 items-center justify-between rounded-xl bg-emerald-400 px-3 text-sm font-black text-emerald-950 hover:bg-emerald-300"
          >
            <span>Xem website</span>
            <span aria-hidden="true">-</span>
          </Link>
        </div>
      </aside>

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((current) => !current)}
                  className="hidden h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-white text-lg font-black text-emerald-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 lg:flex"
                  aria-label={sidebarCollapsed ? 'Mo sidebar' : 'Thu gon sidebar'}
                >
                  {sidebarCollapsed ? '>' : '<'}
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600/70">
                    Quan tri he thong
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-neutral-950">
                    Bang dieu khien
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:justify-end">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-black text-white">
                  {getInitial(user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-950">{getDisplayName(user)}</p>
                  {user?.email && <p className="truncate text-xs text-neutral-500">{user.email}</p>}
                </div>
              </div>
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm hover:border-emerald-500 hover:bg-emerald-50"
              >
                Website
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 shrink-0 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-900/15 hover:bg-emerald-800"
              >
                Dang xuat
              </button>
            </div>
          </div>

          <nav className="scrollbar-hidden flex gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-3 sm:px-5 lg:hidden">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
