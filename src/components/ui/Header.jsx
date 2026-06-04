import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { cartApi, cartStorage, CART_UPDATED_EVENT, getUserId } from '../../features/product'
import { canChangePassword, hasRole, tokenStorage } from '../../shared/api'

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tài khoản'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
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

  const isActive = (path) => location.pathname === path

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

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await authApi.logout()
      navigate('/login', {
        state: {
          successMessage: 'Đăng xuất thành công.',
        },
      })
    } finally {
      setIsLoggingOut(false)
      setAccountMenuOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-white/92 backdrop-blur-md">
      <div className="max-w-[1500px] mx-auto h-18 px-4 sm:h-20 sm:px-6 lg:h-24 lg:px-10">
        <div className="relative flex items-center justify-between h-full">
          <div className="flex min-w-0 flex-1 items-center pr-14 sm:pr-24 lg:pr-6">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="-ml-2 p-2 text-emerald-900/70 hover:text-emerald-950 md:hidden"
              aria-label="Toggle Menu"
            >
              <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>

            <nav className="hidden items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-900/65 whitespace-nowrap md:flex xl:gap-7 xl:text-[13px] xl:tracking-[0.18em]">
              <Link to="/" className={navClass('/')}>Trang chủ</Link>
              <Link to="/products" className={navClass('/products')}>Sản phẩm</Link>
              <Link to="/collections" className={navClass('/collections')}>Bộ sưu tập</Link>
              <Link to="/about" className={navClass('/about')}>Về chúng tôi</Link>
            </nav>
          </div>

          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-[1.65rem] font-light tracking-[0.2em] text-emerald-900 uppercase whitespace-nowrap transition-all duration-300 hover:opacity-75 sm:text-3xl sm:tracking-[0.3em] lg:text-5xl lg:tracking-[0.35em]"
          >
            POLOMAN
          </Link>

          <div className="flex flex-1 items-center justify-end gap-1.5 pl-14 sm:gap-3 sm:pl-24 lg:pl-6 xl:gap-4">
            <div className="relative hidden lg:block w-64">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 bg-white border border-emerald-100 rounded-md text-sm placeholder-emerald-900/35 text-emerald-950 outline-none focus:border-emerald-700 transition-colors"
              />

              <svg
                className="absolute left-3 top-3 h-4 w-4 text-emerald-700/45"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <button className="hidden p-2 text-emerald-900/65 hover:text-emerald-950 sm:block" aria-label="Favorites">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            <Link to="/cart" className="relative p-2 text-emerald-900/65 hover:text-emerald-950" aria-label="Shopping Cart">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>

              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {authSnapshot.isAuthenticated ? (
              <div ref={accountMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 text-sm font-semibold text-emerald-900 transition-colors hover:border-emerald-500"
                  aria-label="Tài khoản"
                  aria-expanded={accountMenuOpen}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitial(user)
                  )}
                  {isAuthInitializing && (
                    <span className="absolute inset-0 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" />
                  )}
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 py-2 shadow-[0_18px_60px_rgba(20,83,45,0.14)] backdrop-blur">
                    <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-emerald-950">
                        {getDisplayName(user)}
                      </p>
                      {user?.email && (
                        <p className="mt-1 truncate text-xs text-emerald-900/55">
                          {user.email}
                        </p>
                      )}
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium text-emerald-900/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      Tài khoản của tôi
                    </Link>
                    <Link
                      to="/account?tab=orders"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium text-emerald-900/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      Đơn hàng
                    </Link>
                    {showChangePassword && (
                      <Link
                        to="/change-password"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm font-medium text-emerald-900/75 transition-colors hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        Đổi mật khẩu
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50"
                      >
                        Quản trị
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </button>
                  </div>
                )}
              </div>
            ) : isAuthInitializing ? (
              <span
                className="hidden sm:flex h-10 w-10 items-center justify-center"
                aria-label="Dang tai tai khoan"
              >
                <span className="h-6 w-6 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" />
              </span>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center justify-center p-2 text-emerald-900/65 hover:text-emerald-950"
                aria-label="Đăng nhập"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
                  />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="flex flex-col space-y-4 border-t border-emerald-100 bg-emerald-50/95 px-4 py-5 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-900/70 md:hidden">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className={isActive('/') ? 'text-emerald-950' : ''}>Trang chủ</Link>
          <Link to="/products" onClick={() => setMobileMenuOpen(false)} className={isActive('/products') ? 'text-emerald-950' : ''}>Sản phẩm</Link>
          <Link to="/collections" onClick={() => setMobileMenuOpen(false)} className={isActive('/collections') ? 'text-emerald-950' : ''}>Bộ sưu tập</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className={isActive('/about') ? 'text-emerald-950' : ''}>Về chúng tôi</Link>
          {authSnapshot.isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={isActive('/admin') ? 'text-emerald-950' : ''}>Quản trị</Link>
              )}
              {showChangePassword && (
                <Link to="/change-password" onClick={() => setMobileMenuOpen(false)} className={isActive('/change-password') ? 'text-emerald-950' : ''}>Đổi mật khẩu</Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-left text-red-600 disabled:opacity-60"
              >
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className={isActive('/login') ? 'text-emerald-950' : ''}>Đăng nhập</Link>
          )}
        </div>
      )}
    </header>
  )
}

export default Header
