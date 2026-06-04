import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  favoriteStorage,
  FAVORITES_UPDATED_EVENT,
  formatCurrency,
} from '../features/product'
import { usePageMeta } from '../shared/hooks/usePageMeta'

function Favorites() {
  const [favorites, setFavorites] = useState(() => favoriteStorage.getItems())

  usePageMeta({
    title: 'San pham yeu thich | PoloMan',
    description: 'Danh sach san pham PoloMan ban da luu vao yeu thich.',
    canonicalPath: '/favorites',
  })

  useEffect(() => {
    const syncFavorites = () => {
      setFavorites(favoriteStorage.getItems())
    }

    window.addEventListener(FAVORITES_UPDATED_EVENT, syncFavorites)
    window.addEventListener('storage', syncFavorites)

    return () => {
      window.removeEventListener(FAVORITES_UPDATED_EVENT, syncFavorites)
      window.removeEventListener('storage', syncFavorites)
    }
  }, [])

  const totalValue = useMemo(
    () => favorites.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [favorites],
  )

  const handleRemove = (productId) => {
    favoriteStorage.removeItem(productId)
    setFavorites(favoriteStorage.getItems())
  }

  return (
    <div className="space-y-6 rounded-3xl bg-[linear-gradient(135deg,#fbfdf8_0%,#f2f8ef_52%,#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">San pham yeu thich</span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white/85 shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#064e3b_0%,#047857_60%,#0f766e_100%)] p-5 text-white sm:p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Wishlist</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              San pham yeu thich
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Luu lai nhung mau ao, mau quan ban dang can nhac de quay lai mua nhanh hon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Da luu</p>
              <p className="mt-2 text-3xl font-black">{favorites.length}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tam tinh</p>
              <p className="mt-2 text-lg font-black">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </section>

      {favorites.length ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((item) => (
            <article
              key={item.productId}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <Link to={`/products/${item.slug || item.productId}`} className="relative block aspect-[4/5] overflow-hidden bg-emerald-50">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-400">
                    No image
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                <div>
                  <Link
                    to={`/products/${item.slug || item.productId}`}
                    className="line-clamp-2 text-sm font-bold text-emerald-950 hover:text-emerald-700"
                  >
                    {item.name || 'San pham'}
                  </Link>
                  <p className="mt-2 text-sm font-black text-emerald-900">
                    {formatCurrency(item.price || 0)}
                  </p>
                  {(item.colorName || item.size) && (
                    <p className="mt-1 text-xs text-emerald-900/55">
                      {item.colorName ? `Mau: ${item.colorName}` : 'Mau: -'} / {item.size ? `Size: ${item.size}` : 'Size: -'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_44px] gap-2">
                  <Link
                    to={`/products/${item.slug || item.productId}`}
                    className="flex h-11 items-center justify-center rounded-md bg-emerald-800 px-3 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
                  >
                    Xem chi tiet
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    className="flex h-11 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 hover:border-red-300"
                    aria-label="Xoa khoi yeu thich"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-3xl font-black text-emerald-900">
            ♥
          </div>
          <h2 className="mt-5 text-xl font-black text-emerald-950">Chua co san pham yeu thich</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-900/60">
            Bam vao bieu tuong trai tim o san pham de luu vao danh sach nay.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
          >
            Kham pha san pham
          </Link>
        </section>
      )}
    </div>
  )
}

export default Favorites
