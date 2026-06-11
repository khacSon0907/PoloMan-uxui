import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { tokenStorage } from '../../shared/api'

const adminNavItems = [
  { to: '/admin', label: 'Tong quan' },
  { to: '/admin/categories', label: 'Danh muc' },
  { to: '/admin/products', label: 'San pham' },
  { to: '/admin/banners', label: 'Banner' },
  { to: '/admin/promotion-banners', label: 'Promotion' },
  { to: '/admin/orders', label: 'Don hang' },
  { to: '/admin/users', label: 'Khach hang' },
]

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Admin'
}

function AdminLayout() {
  const navigate = useNavigate()
  const user = tokenStorage.getUser()

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
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-emerald-800/20 bg-emerald-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <Link to="/admin" className="block text-2xl font-light tracking-[0.28em] uppercase text-white">
            POLOMAN
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/75">
            Admin console
          </p>
        </div>

        <nav className="flex-1 px-4 py-5">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `mb-1 flex h-11 items-center rounded-md px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            to="/"
            className="flex h-10 items-center rounded-md px-3 text-sm font-semibold text-emerald-50/80 hover:bg-white/10 hover:text-white"
          >
            Xem website
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Quan tri he thong
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold text-neutral-950">Bang dieu khien</h1>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end sm:gap-3">
              <div className="min-w-0 text-left sm:text-right">
                <p className="truncate text-sm font-semibold text-neutral-950">{getDisplayName(user)}</p>
                {user?.email && <p className="truncate text-xs text-neutral-500">{user.email}</p>}
              </div>
              <Link
                to="/"
                className="hidden h-10 items-center rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-800 hover:border-emerald-600 hover:text-emerald-700 sm:flex"
              >
                Website
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="h-10 shrink-0 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 sm:px-4"
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
