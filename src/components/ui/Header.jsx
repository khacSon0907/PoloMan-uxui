import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { cartApi, cartStorage, CART_UPDATED_EVENT, getUserId } from '../../features/product'
import { canChangePassword, hasRole, tokenStorage } from '../../shared/api'

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/collections', label: 'Bộ sưu tập' },
  { to: '/about', label: 'Về chúng tôi' },
]

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tài khoản'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'M6 18L18 6M6 6l12 12',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    cart: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    heart:
      'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0',
    order: 'M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z',
    lock: 'M16 11V7a4 4 0 00-8 0v4m-2 0h12v10H6V11z',
    admin: 'M12 3l8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z',
    logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3h-9m9 0l-3-3m3 3l-3 3',
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={paths[name]} />
    </svg>
  )
}

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const accountMenuRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [cartCount, setCartCount] = useState(() => cartStorage.getCount())
  const user = authSnapshot.user
  const userId = getUserId(user)
  const isAuthInitializing = authSnapshot.isInitializing
  const isAdmin = hasRole(user, 'ADMIN')
  const showChangePassword = canChangePassword(user)
  const isAuthenticated = authSnapshot.isAuthenticated

  const isActive = (path) => location.pathname === path
  const closeMenus = () => {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }

  const accountLinks = [
    { to: '/account', label: 'Tài khoản của tôi', icon: 'user', show: true },
    { to: '/account?tab=orders', label: 'Đơn hàng', icon: 'order', show: true },
    { to: '/change-password', label: 'Đổi mật khẩu', icon: 'lock', show: showChangePassword },
    { to: '/admin', label: 'Quản trị', icon: 'admin', show: isAdmin },
  ].filter((item) => item.show)

  const navClass = (path) =>
    `relative py-1 whitespace-nowrap transition-colors duration-300 hover:text-emerald-900 ${
      isActive(path)
        ? 'text-emerald-900 after:absolute after:bottom-[-6px] after:left-0 after:h-[2px] after:w-full after:bg-emerald-800'
        : 'after:absolute after:bottom-[-6px] after:left-0 after:h-[2px] after:w-0 after:bg-emerald-800 after:transition-all hover:after:w-full'
    }`

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    const syncCartCount = async () => {
      if (!userId) {
        setCartCount(cartStorage.getCount())
        return
      }

      try {
        const cart = await cartApi.getCart(userId)
        setCartCount(Number(cart?.totalQuantity || 0))
      } catch {
        setCartCount(0)
      }
    }

    syncCartCount()

    window.addEventListener(CART_UPDATED_EVENT, syncCartCount)
    window.addEventListener('storage', syncCartCount)

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount)
      window.removeEventListener('storage', syncCartCount)
    }
  }, [userId])

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
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await authApi.logout()
      closeMenus()
      navigate('/login', {
        state: {
          successMessage: 'Đăng xuất thành công.',
        },
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-white/94 backdrop-blur-md">
      <div className="mx-auto h-16 max-w-[1500px] px-4 sm:h-20 sm:px-6 lg:h-24 lg:px-10">
        <div className="relative flex h-full items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center pr-14 sm:pr-24 lg:pr-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-950 md:hidden"
              aria-label="Mở menu"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>

            <nav className="hidden items-center gap-4 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-900/65 md:flex xl:gap-7 xl:text-[13px] xl:tracking-[0.18em]">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className={navClass(item.to)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[1.45rem] font-light uppercase tracking-[0.2em] text-emerald-900 transition-opacity hover:opacity-75 sm:text-3xl sm:tracking-[0.3em] lg:text-5xl lg:tracking-[0.35em]"
          >
            POLOMAN
          </Link>

          <div className="flex flex-1 items-center justify-end gap-1.5 pl-14 sm:gap-3 sm:pl-24 lg:pl-6 xl:gap-4">
            <div className="relative hidden w-64 lg:block">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 w-full rounded-md border border-emerald-100 bg-white pl-10 pr-3 text-sm text-emerald-950 outline-none transition-colors placeholder:text-emerald-900/35 focus:border-emerald-700"
              />
              <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-emerald-700/45" />
            </div>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-emerald-900/65 hover:bg-emerald-50 hover:text-emerald-950 sm:flex"
              aria-label="Yêu thích"
            >
              <Icon name="heart" className="h-6 w-6" />
            </button>

            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-emerald-900/65 hover:bg-emerald-50 hover:text-emerald-950"
              aria-label="Giỏ hàng"
            >
              <Icon name="cart" className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div ref={accountMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 text-sm font-semibold text-emerald-900 transition-colors hover:border-emerald-500"
                  aria-label="Tài khoản"
                  aria-expanded={accountMenuOpen}
                >
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                  {isAuthInitializing && (
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                  )}
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 w-76 overflow-hidden rounded-2xl border border-emerald-100 bg-white/98 py-2 shadow-[0_24px_70px_rgba(20,83,45,0.18)] backdrop-blur">
                    <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-800 text-sm font-black text-white">
                          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-emerald-950">{getDisplayName(user)}</p>
                          {user?.email && <p className="mt-1 truncate text-xs text-emerald-900/55">{user.email}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      {accountLinks.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={closeMenus}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-900/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                        >
                          <Icon name={item.icon} className="h-5 w-5 text-emerald-700/70" />
                          {item.label}
                        </Link>
                      ))}

                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="logout" className="h-5 w-5" />
                        {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isAuthInitializing ? (
              <span className="hidden h-10 w-10 items-center justify-center sm:flex" aria-label="Đang tải tài khoản">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
              </span>
            ) : (
              <Link
                to="/login"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-emerald-900/65 hover:bg-emerald-50 hover:text-emerald-950 sm:flex"
                aria-label="Đăng nhập"
              >
                <Icon name="user" className="h-6 w-6" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/35 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
          />
          <div className="absolute left-0 top-0 flex h-dvh w-[min(88vw,360px)] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#f7fbf3_0%,#edf7eb_100%)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <Link to="/" onClick={closeMenus} className="text-2xl font-light uppercase tracking-[0.24em] text-emerald-900">
                  POLOMAN
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-900 shadow-sm"
                  aria-label="Đóng menu"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mt-4">
                <input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 w-full rounded-xl border border-emerald-100 bg-white pl-10 pr-3 text-sm text-emerald-950 outline-none placeholder:text-emerald-900/35 focus:border-emerald-700"
                />
                <Icon name="search" className="absolute left-3 top-3.5 h-4 w-4 text-emerald-700/45" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMenus}
                    className={`flex h-12 items-center rounded-xl px-4 text-sm font-black uppercase tracking-[0.12em] ${
                      isActive(item.to)
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="my-5 h-px bg-emerald-100" />

              {isAuthenticated ? (
                <section className="space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-800 text-sm font-black text-white">
                        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-emerald-950">{getDisplayName(user)}</p>
                        {user?.email && <p className="mt-1 truncate text-xs text-emerald-900/55">{user.email}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {accountLinks.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeMenus}
                        className={`flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold ${
                          isActive(item.to.split('?')[0])
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-50'
                        }`}
                      >
                        <Icon name={item.icon} className="h-5 w-5" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className="flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-black uppercase tracking-[0.12em] text-white"
                >
                  Đăng nhập
                </Link>
              )}
            </div>

            <div className="border-t border-emerald-100 bg-white p-4">
              <Link
                to="/cart"
                onClick={closeMenus}
                className="mb-3 flex h-12 items-center justify-between rounded-xl bg-emerald-50 px-4 text-sm font-black text-emerald-950"
              >
                <span className="flex items-center gap-3">
                  <Icon name="cart" className="h-5 w-5" />
                  Giỏ hàng
                </span>
                <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-xs text-white">{cartCount}</span>
              </Link>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 text-sm font-black uppercase tracking-[0.12em] text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="logout" className="h-5 w-5" />
                  {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
