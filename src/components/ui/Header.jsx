import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const navClass = (path) =>
    `relative py-1 whitespace-nowrap transition-colors duration-300 hover:text-black ${isActive(path)
      ? 'text-black after:absolute after:bottom-[-6px] after:left-0 after:h-[2px] after:w-full after:bg-black'
      : 'after:absolute after:bottom-[-6px] after:left-0 after:h-[2px] after:w-0 after:bg-black after:transition-all hover:after:w-full'
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10 h-24">
        <div className="relative flex items-center justify-between h-full">
          <div className="flex items-center min-w-0 pr-24">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-700 hover:text-black"
              aria-label="Toggle Menu"
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>

            <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold uppercase tracking-[0.18em] text-neutral-600 whitespace-nowrap">
              <Link to="/" className={navClass('/')}>Trang chủ</Link>
              <Link to="/products" className={navClass('/products')}>Sản phẩm</Link>
              <Link to="/collections" className={navClass('/collections')}>Bộ sưu tập</Link>
              <Link to="/about" className={navClass('/about')}>Về chúng tôi</Link>
            </nav>
          </div>

          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-3xl md:text-5xl font-light tracking-[0.35em] text-black uppercase hover:opacity-75 transition-all duration-300 whitespace-nowrap"
          >
            POLOMAN
          </Link>

          <div className="flex items-center gap-4 pl-24">
            <div className="relative hidden lg:block w-64">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 bg-white border border-neutral-200 rounded-md text-sm placeholder-neutral-400 text-neutral-800 outline-none focus:border-black transition-colors"
              />

              <svg
                className="absolute left-3 top-3 h-4 w-4 text-neutral-400"
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

            <button className="hidden sm:block p-2 text-neutral-600 hover:text-black" aria-label="Favorites">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            <button className="p-2 text-neutral-600 hover:text-black relative" aria-label="Shopping Cart">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>

              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-black text-[10px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </button>

            <Link to="/login" className="hidden sm:flex items-center justify-center p-2 text-neutral-600 hover:text-black" aria-label="User profile">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-5 space-y-4 flex flex-col text-sm font-semibold uppercase tracking-[0.18em] text-neutral-700">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className={isActive('/') ? 'text-black' : ''}>Trang chủ</Link>
          <Link to="/products" onClick={() => setMobileMenuOpen(false)} className={isActive('/products') ? 'text-black' : ''}>Sản phẩm</Link>
          <Link to="/collections" onClick={() => setMobileMenuOpen(false)} className={isActive('/collections') ? 'text-black' : ''}>Bộ sưu tập</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className={isActive('/about') ? 'text-black' : ''}>Về chúng tôi</Link>
        </div>
      )}
    </header>
  )
}

export default Header