import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Heart, LogOut, Menu, Package, Search, ShieldCheck, ShoppingBag, UserRound, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { authApi } from '../../features/auth'
import { categoryApi, normalizeCategoryTree } from '../../features/category'
import { cartApi, cartStorage, CART_UPDATED_EVENT, getUserId } from '../../features/product'
import { canChangePassword, hasRole, tokenStorage } from '../../shared/api'
import PromotionTicker from './PromotionTicker'

const navItems = [
  { to: '/', label: 'Trang chu' },
  { to: '/products', label: 'San pham' },
  { to: '/collections', label: 'Bo suu tap' },
  { to: '/about', label: 'Ve chung toi' },
]

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tai khoan'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

function getCategoryUrl(category) {
  return `/products?category=${category?.slug || category?.id || 'all'}`
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
  const [categoryTree, setCategoryTree] = useState([])
  const user = authSnapshot.user
  const userId = getUserId(user)
  const isAuthenticated = authSnapshot.isAuthenticated
  const isAuthInitializing = authSnapshot.isInitializing
  const isAdmin = hasRole(user, 'ADMIN')
  const showChangePassword = canChangePassword(user)
  const isActive = (path) => location.pathname === path

  const productMenuGroups = useMemo(
    () =>
      categoryTree
        .filter((category) => category.active !== false)
        .map((category) => ({
          ...category,
          children: (category.children || []).filter((child) => child.active !== false),
        }))
        .filter((category) => category.children.length),
    [categoryTree],
  )

  const accountLinks = [
    { to: '/account', label: 'Tai khoan cua toi', icon: UserRound, show: true },
    { to: '/account/orders', label: 'Don hang', icon: Package, show: true },
    { to: '/change-password', label: 'Doi mat khau', icon: ShieldCheck, show: showChangePassword },
    { to: '/admin', label: 'Quan tri', icon: ShieldCheck, show: isAdmin },
  ].filter((item) => item.show)

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    categoryApi
      .list()
      .then((categories) => {
        if (isMounted) setCategoryTree(normalizeCategoryTree(categories))
      })
      .catch(() => {
        if (isMounted) setCategoryTree([])
      })

    return () => {
      isMounted = false
    }
  }, [])

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
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [accountMenuOpen])

  const closeMenus = () => {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await authApi.logout()
      closeMenus()
      navigate('/login', { state: { successMessage: 'Dang xuat thanh cong.' } })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navLinkClass = (path) =>
    `text-sm font-black uppercase tracking-[0.08em] transition-colors ${
      isActive(path) ? 'text-emerald-900' : 'text-neutral-800 hover:text-emerald-800'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur">
      <PromotionTicker />
      <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-emerald-900 hover:bg-emerald-50 lg:hidden"
          aria-label="Mo menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link to="/" className="shrink-0 text-3xl font-light uppercase tracking-[0.28em] text-emerald-900">
          Poloman
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) =>
            item.to === '/products' ? (
              <div key={item.to} className="group relative">
                <Link to={item.to} className={`${navLinkClass(item.to)} inline-flex items-center gap-1.5`}>
                  {item.label}
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                </Link>
                {productMenuGroups.length > 0 && (
                  <div className="invisible absolute left-0 top-12 w-[520px] translate-y-2 rounded-2xl border border-emerald-100 bg-white p-5 opacity-0 shadow-[0_22px_60px_rgba(20,83,45,0.14)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {productMenuGroups.map((category) => (
                        <div key={category.id || category.slug || category.name}>
                          <Link to={getCategoryUrl(category)} className="font-black text-emerald-900 hover:text-emerald-700">
                            {category.name}
                          </Link>
                          <div className="mt-2 space-y-1">
                            {category.children.map((child) => (
                              <Link
                                key={child.id || child.slug || child.name}
                                to={getCategoryUrl(child)}
                                className="block rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={item.to} to={item.to} className={navLinkClass(item.to)}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
            }}
            className="relative hidden w-80 xl:block"
          >
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tim san pham..."
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-12 pr-4 text-sm outline-none transition-colors focus:border-emerald-700"
            />
          </form>

          <Link to="/favorites" className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-emerald-50 sm:flex" aria-label="Yeu thich">
            <Heart className="h-6 w-6" strokeWidth={1.8} />
          </Link>

          <Link to="/cart" data-cart-target className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-emerald-50" aria-label="Gio hang">
            <ShoppingBag className="h-6 w-6" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-black text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((current) => !current)}
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-sm font-black text-emerald-900 ring-1 ring-emerald-100"
                aria-label="Tai khoan"
              >
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                {isAuthInitializing && <span className="absolute h-12 w-12 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(20,83,45,0.18)]">
                  <div className="bg-emerald-50/70 px-4 py-4">
                    <p className="truncate text-sm font-black text-emerald-950">{getDisplayName(user)}</p>
                    {user?.email && <p className="mt-1 truncate text-xs text-emerald-900/60">{user.email}</p>}
                  </div>
                  <div className="p-2">
                    {accountLinks.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.to} to={item.to} onClick={closeMenus} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-900/75 hover:bg-emerald-50">
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      )
                    })}
                    <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                      <LogOut className="h-5 w-5" />
                      {isLoggingOut ? 'Dang dang xuat...' : 'Dang xuat'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-emerald-50" aria-label="Dang nhap">
              <UserRound className="h-6 w-6" />
            </Link>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-emerald-950/35" onClick={() => setMobileMenuOpen(false)} aria-label="Dong menu" />
          <div className="absolute left-0 top-0 flex h-dvh w-[min(88vw,360px)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-5">
              <Link to="/" onClick={closeMenus} className="text-2xl font-light uppercase tracking-[0.24em] text-emerald-900">
                Poloman
              </Link>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto p-5">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={closeMenus} className={`flex h-12 items-center rounded-xl px-4 text-sm font-black uppercase tracking-[0.12em] ${isActive(item.to) ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-950'}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
