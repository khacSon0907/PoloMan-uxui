import { useEffect, useRef, useState } from 'react'
import {
  Boxes,
  ChevronDown,
  ExternalLink,
  Image,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  Bell,
  AlertTriangle,
  Star,
  RefreshCw,
} from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { tokenStorage } from '../../shared/api'

const adminNavItems = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/categories', label: 'Danh mục', icon: Tags },
  { to: '/admin/products', label: 'Sản phẩm', icon: Package },
  { to: '/admin/banners', label: 'Banner', icon: Image },
  { to: '/admin/promotion-banners', label: 'Promotion', icon: Megaphone },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { to: '/admin/refunds', label: 'Hoàn tiền', icon: RefreshCw },
  { to: '/admin/shipping-rules', label: 'Phi ship', icon: Truck },
  { to: '/admin/users', label: 'Khách hàng', icon: Users },
  { to: '/admin/roles', label: 'Vai trò', icon: ShieldCheck },
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
  
  // Account Menu States & Ref
  const accountMenuRef = useRef(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Notification Menu States & Ref (Facebook Style)
  const notifMenuRef = useRef(null)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'order', text: 'Có 5 đơn hàng mới cần xử lý', time: '10 phút trước', isUnread: true },
    { id: 2, type: 'stock', text: 'Sản phẩm "Polo Basic XL" sắp hết hàng (còn 3 cái)', time: '30 phút trước', isUnread: true },
    { id: 3, type: 'review', text: 'Có 2 đánh giá 5 sao mới cho Polo Premium', time: '2 giờ trước', isUnread: false },
    { id: 4, type: 'return', text: 'Khách hàng Nguyễn Văn A yêu cầu hoàn trả đơn #PM0985', time: '1 ngày trước', isUnread: false },
  ])

  // Count unread notifications
  const unreadNotifsCount = notifications.filter((n) => n.isUnread).length

  // Helper functions for notifications
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })))
  }

  const toggleNotifRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    )
  }

  const getNotifIcon = (type) => {
    switch (type) {
      case 'order':
        return ShoppingBag
      case 'stock':
        return AlertTriangle
      case 'review':
        return Star
      case 'return':
        return RefreshCw
      default:
        return Bell
    }
  }

  const getNotifColor = (type) => {
    switch (type) {
      case 'order':
        return 'bg-emerald-500/10 text-emerald-600'
      case 'stock':
        return 'bg-amber-500/10 text-amber-600'
      case 'review':
        return 'bg-yellow-500/10 text-yellow-600'
      case 'return':
        return 'bg-rose-500/10 text-rose-600'
      default:
        return 'bg-neutral-500/10 text-neutral-600'
    }
  }

  useEffect(() => {
    if (!accountMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (!notifMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!notifMenuRef.current?.contains(event.target)) {
        setNotifMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [notifMenuOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await authApi.logout()
      setAccountMenuOpen(false)
      navigate('/login', {
        replace: true,
        state: {
          successMessage: 'Dang xuat thanh cong.',
        },
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbf8] text-neutral-950">
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-emerald-100 bg-[linear-gradient(180deg,#f7fff9_0%,#f1fbf5_58%,#ffffff_100%)] text-emerald-950 shadow-[14px_0_50px_rgba(6,78,59,0.06)] transition-all duration-300 lg:flex lg:flex-col ${
          sidebarCollapsed ? 'w-24' : 'w-72'
        }`}
      >
        <div className="px-5 pb-6 pt-6">
          <Link
            to="/admin"
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-4'}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-light text-white shadow-lg shadow-emerald-700/20">
              P
            </span>
            <span className={`min-w-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <span className="block text-xl font-light uppercase tracking-[0.28em] text-emerald-950">
                POLOMAN
              </span>
              <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700/65">
                Admin console
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <p
            className={`px-3 pb-4 pt-3 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-900/55 ${
              sidebarCollapsed ? 'text-center' : ''
            }`}
          >
            {sidebarCollapsed ? 'QL' : 'Quan ly'}
          </p>
          {adminNavItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `group relative flex min-h-12 items-center rounded-2xl px-3 text-sm font-bold transition-all ${
                    sidebarCollapsed ? 'justify-center' : 'gap-3'
                  } ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100'
                      : 'text-emerald-950/72 hover:bg-white hover:text-emerald-900 hover:shadow-sm'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-emerald-50 text-emerald-900/70 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                      }`}
                    >
                      <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? 'hidden' : ''}`}>{item.label}</span>
                    {isActive && !sidebarCollapsed && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className={`${sidebarCollapsed ? 'hidden' : 'block'} border-t border-emerald-100 p-4`}>
          <p className="px-3 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900/55">
            Store front
          </p>
          <Link
            to="/"
            className="mt-3 flex h-12 items-center justify-between rounded-2xl border border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-950 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Store size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              Xem website
            </span>
            <ExternalLink size={16} strokeWidth={2.1} aria-hidden="true" />
          </Link>

          <div className="mt-20 rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-emerald-700">
                <Boxes size={21} strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-emerald-950">POLOMAN</p>
                <p className="mt-1 text-xs text-emerald-900/60">Premium Polo For Men</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden h-11 w-11 items-center justify-center rounded-xl text-emerald-950 hover:bg-emerald-50 lg:flex"
              aria-label={sidebarCollapsed ? 'Mo sidebar' : 'Thu gon sidebar'}
            >
              <Menu size={22} strokeWidth={2} aria-hidden="true" />
            </button>

            <div className="ml-auto flex items-center gap-4">
              {/* Notifications Dropdown (Facebook Style) */}
              <div ref={notifMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifMenuOpen((current) => !current)}
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-950 cursor-pointer"
                  aria-label="Thông báo"
                >
                  <Bell size={18} strokeWidth={2} />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-bounce">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(6,78,59,0.16)]">
                    {/* Header */}
                    <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 flex items-center justify-between">
                      <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        Thông báo mới
                      </h3>
                      {unreadNotifsCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-3xs font-black text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs font-semibold text-emerald-900/40">
                          Không có thông báo mới nào
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const NotifIcon = getNotifIcon(notif.type)
                          const colorClass = getNotifColor(notif.type)
                          return (
                            <div
                              key={notif.id}
                              onClick={() => toggleNotifRead(notif.id)}
                              className={`flex items-start gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors cursor-pointer ${
                                notif.isUnread ? 'bg-emerald-50/10' : ''
                              }`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                                <NotifIcon size={15} strokeWidth={2.3} />
                              </span>
                              <div className="flex-1 space-y-0.5">
                                <p className="text-xs font-bold text-neutral-800 leading-tight">
                                  {notif.text}
                                </p>
                                <p className="text-3xs font-semibold text-neutral-400">
                                  {notif.time}
                                </p>
                              </div>
                              {notif.isUnread && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600 self-center" />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-emerald-100 bg-emerald-50/20 p-3 text-center">
                      <Link
                        to="/admin/orders"
                        onClick={() => setNotifMenuOpen(false)}
                        className="block text-2xs font-black text-emerald-800 hover:text-emerald-950 transition-colors"
                      >
                        Xem tất cả đơn hàng
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-emerald-50"
                  aria-label="Menu tai khoan"
                  aria-expanded={accountMenuOpen}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-black text-emerald-800">
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="truncate text-sm font-black text-neutral-950">{getDisplayName(user)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-neutral-500">admin</p>
                  </div>
                  <ChevronDown
                    size={17}
                    strokeWidth={2.2}
                    className={`hidden text-neutral-500 transition-transform sm:block ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(6,78,59,0.16)]">
                    <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-sm font-black text-white">
                          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-emerald-950">{getDisplayName(user)}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-emerald-900/55">
                            {user?.email || 'admin'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-emerald-950/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <UserRound size={17} strokeWidth={2.1} aria-hidden="true" />
                        </span>
                        Tai khoan cua toi
                      </Link>
                      <Link
                        to="/change-password"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-emerald-950/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <KeyRound size={17} strokeWidth={2.1} aria-hidden="true" />
                        </span>
                        Doi mat khau
                      </Link>
                      <Link
                        to="/"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-emerald-950/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <ExternalLink size={17} strokeWidth={2.1} aria-hidden="true" />
                        </span>
                        Xem website
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <LogOut size={17} strokeWidth={2.1} aria-hidden="true" />
                        </span>
                        {isLoggingOut ? 'Dang dang xuat...' : 'Dang xuat'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav className="scrollbar-hidden flex gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-3 sm:px-6 lg:hidden">
            {adminNavItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
