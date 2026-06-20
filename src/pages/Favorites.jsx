import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'

import {
  favoriteApi,
  formatCurrency,
  getUserId,
} from '../features/product'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'

function Favorites() {
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [favorites, setFavorites] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [removingProductIds, setRemovingProductIds] = useState(() => new Set())
  const [isClearing, setIsClearing] = useState(false)
  const userId = getUserId(authSnapshot.user)

  usePageMeta({
    title: 'San pham yeu thich | PoloMan',
    description: 'Danh sach san pham PoloMan ban da luu vao yeu thich.',
    canonicalPath: '/favorites',
  })

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (!userId) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setFavorites([])
        setIsLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
    })

    favoriteApi
      .getFavorite(userId)
      .then((items) => {
        if (isMounted) setFavorites(items)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai danh sach yeu thich.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const totalValue = useMemo(
    () => favorites.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [favorites],
  )

  const refetchFavorites = async () => {
    if (!userId) return
    const items = await favoriteApi.getFavorite(userId)
    setFavorites(items)
  }

  const handleRemove = async (productId) => {
    if (!userId || !productId || removingProductIds.has(String(productId))) return

    const normalizedProductId = String(productId)
    const previousFavorites = favorites

    setRemovingProductIds((current) => new Set(current).add(normalizedProductId))
    setFavorites((current) => current.filter((item) => String(item.productId) !== normalizedProductId))
    setErrorMessage('')

    try {
      await favoriteApi.removeItem(userId, productId)
      await refetchFavorites()
    } catch (error) {
      setFavorites(previousFavorites)
      setErrorMessage(getApiMessage(error, 'Khong the xoa san pham khoi yeu thich.'))
    } finally {
      setRemovingProductIds((current) => {
        const next = new Set(current)
        next.delete(normalizedProductId)
        return next
      })
    }
  }

  const handleClearAll = async () => {
    if (!userId || isClearing || !favorites.length) return

    const previousFavorites = favorites

    setIsClearing(true)
    setFavorites([])
    setErrorMessage('')

    try {
      await favoriteApi.clearFavorite(userId)
      await refetchFavorites()
    } catch (error) {
      setFavorites(previousFavorites)
      setErrorMessage(getApiMessage(error, 'Khong the xoa tat ca san pham yeu thich.'))
    } finally {
      setIsClearing(false)
    }
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

      {!userId ? (
        <section className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-8 text-center sm:p-12">
          <Heart className="mx-auto h-14 w-14 text-emerald-700" />
          <h2 className="mt-5 text-xl font-black text-emerald-950">Can dang nhap de xem yeu thich</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-900/60">
            Dang nhap tai khoan PoloMan de luu va dong bo danh sach san pham yeu thich.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
          >
            Dang nhap
          </Link>
        </section>
      ) : isLoading ? (
        <section className="flex min-h-72 items-center justify-center rounded-2xl border border-emerald-100 bg-white/80">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
        </section>
      ) : errorMessage ? (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {errorMessage}
        </section>
      ) : favorites.length ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-100 bg-white px-4 text-sm font-bold text-red-600 hover:border-red-300 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Dang xoa...' : 'Xoa tat ca'}
            </button>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((item) => {
              const isRemoving = removingProductIds.has(String(item.productId))

              return (
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
                        disabled={isRemoving}
                        className="flex h-11 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 hover:border-red-300 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Xoa khoi yeu thich"
                      >
                        <Heart className="h-4 w-4" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-8 text-center sm:p-12">
          <Heart className="mx-auto h-14 w-14 text-emerald-700" />
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
