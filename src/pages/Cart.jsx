import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  cartApi,
  cartStorage,
  CART_UPDATED_EVENT,
  formatCurrency,
  getUserId,
  normalizeCartItems,
} from '../features/product'
import { userApi } from '../features/user'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'

const initialCheckoutForm = {
  fullName: '',
  phoneNumber: '',
  address: '',
  province: '',
  district: '',
  ward: '',
  note: '',
}

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.username || user?.email || ''
}

function getUserAddress(user) {
  if (typeof user?.address === 'string') return user.address

  return (
    user?.address?.detail ||
    user?.address?.street ||
    user?.shippingAddress ||
    user?.defaultAddress ||
    ''
  )
}

function getCheckoutForm(user) {
  return {
    fullName: getDisplayName(user),
    phoneNumber: user?.phoneNumber || user?.phone || '',
    address: getUserAddress(user),
    province: user?.province || user?.address?.province || '',
    district: user?.district || user?.address?.district || '',
    ward: user?.ward || user?.address?.ward || '',
    note: '',
  }
}

function Cart() {
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [items, setItems] = useState(() => cartStorage.getItems())
  const [checkoutForm, setCheckoutForm] = useState(() => getCheckoutForm(tokenStorage.getUser()))
  const [profileMessage, setProfileMessage] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const user = authSnapshot.user
  const userId = getUserId(user)
  const isAuthenticated = authSnapshot.isAuthenticated
  const isAuthInitializing = authSnapshot.isInitializing

  usePageMeta({
    title: 'Gio hang cua ban | PoloMan',
    description: 'Kiem tra gio hang va thong tin giao hang.',
    canonicalPath: '/cart',
  })

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    const syncCart = async () => {
      if (isAuthInitializing || (isAuthenticated && !userId)) {
        return
      }

      if (!userId) {
        setItems(cartStorage.getItems())
        return
      }

      try {
        const cart = await cartApi.getCart(userId)
        setItems(normalizeCartItems(cart))
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(getApiMessage(error, 'Khong the tai gio hang.'))
      }
    }

    syncCart()

    window.addEventListener(CART_UPDATED_EVENT, syncCart)
    window.addEventListener('storage', syncCart)

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [isAuthInitializing, isAuthenticated, userId])

  useEffect(() => {
    let isMounted = true

    if (isAuthInitializing) {
      return () => {
        isMounted = false
      }
    }

    if (!isAuthenticated) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setCheckoutForm((current) => ({ ...initialCheckoutForm, note: current.note }))
        setProfileMessage('')
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoadingProfile(true)
      setProfileMessage('')
    })

    userApi
      .getMe()
      .then((user) => {
        if (!isMounted) return

        tokenStorage.setUser(user)
        setCheckoutForm((current) => ({
          ...getCheckoutForm(user),
          note: current.note,
        }))
        setProfileMessage('Da dien thong tin tu tai khoan cua ban.')
      })
      .catch((error) => {
        if (isMounted) {
          setProfileMessage(getApiMessage(error, 'Khong the tai thong tin tai khoan.'))
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false)
      })

    return () => {
      isMounted = false
    }
  }, [isAuthInitializing, isAuthenticated])

  const handleCheckoutFieldChange = (event) => {
    const { name, value } = event.target
    setCheckoutForm((current) => ({ ...current, [name]: value }))
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  )
  const shippingFee = subtotal >= 399000 || subtotal === 0 ? 0 : 30000
  const discount = subtotal >= 799000 ? 50000 : subtotal >= 499000 ? 20000 : 0
  const total = Math.max(0, subtotal + shippingFee - discount)

  const handleQuantityChange = async (index, quantity) => {
    const item = items[index]
    const nextQuantity = Math.max(1, Number(quantity || 1))

    if (!item) return

    if (!userId) {
      cartStorage.updateQuantity(index, nextQuantity)
      setItems(cartStorage.getItems())
      return
    }

    try {
      const cart = await cartApi.updateItem(userId, item.productId, {
        productId: item.productId,
        colorId: item.colorId,
        sizeId: item.sizeId,
        quantity: nextQuantity,
      })
      setItems(normalizeCartItems(cart))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the cap nhat gio hang.'))
    }
  }

  const handleRemove = async (index) => {
    const item = items[index]

    if (!item) return

    if (!userId) {
      cartStorage.removeItem(index)
      setItems(cartStorage.getItems())
      return
    }

    try {
      const cart = await cartApi.removeItem(userId, item.productId)
      setItems(normalizeCartItems(cart))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the xoa san pham khoi gio hang.'))
    }
  }

  return (
    <div className="space-y-6 rounded-3xl bg-[linear-gradient(135deg,#fbfdf8_0%,#f1f8ee_52%,#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-emerald-900">
          San pham
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">Gio hang</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-black text-emerald-950 sm:text-3xl">Thong tin don hang</h1>
            <p className="mt-2 text-sm text-emerald-900/60">
              {isAuthenticated
                ? 'Thong tin giao hang duoc lay tu tai khoan va co the chinh sua.'
                : 'Nhap thong tin giao hang de hoan tat don hang.'}
            </p>
          </div>

          {isAuthenticated && (
            <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-emerald-950">Thong tin tai khoan</p>
                  <p className="mt-1 text-sm text-emerald-900/60">
                    {isLoadingProfile ? 'Dang tai thong tin...' : profileMessage || 'San sang giao hang cho tai khoan cua ban.'}
                  </p>
                </div>
                {isLoadingProfile && (
                  <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">Ho ten</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {checkoutForm.fullName || getDisplayName(user) || 'Chua cap nhat'}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">Email</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {user?.email || 'Chua cap nhat'}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">So dien thoai</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {checkoutForm.phoneNumber || user?.phoneNumber || user?.phone || 'Chua cap nhat'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm">
            <input
              name="fullName"
              value={checkoutForm.fullName}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Ho va ten"
            />
            <input
              name="phoneNumber"
              value={checkoutForm.phoneNumber}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="So dien thoai"
            />
            <input
              name="address"
              value={checkoutForm.address}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Dia chi"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                name="province"
                value={checkoutForm.province}
                onChange={handleCheckoutFieldChange}
                className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Chon tinh/thanh pho</option>
                {checkoutForm.province && <option value={checkoutForm.province}>{checkoutForm.province}</option>}
              </select>
              <select
                name="district"
                value={checkoutForm.district}
                onChange={handleCheckoutFieldChange}
                className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Chon quan/huyen</option>
                {checkoutForm.district && <option value={checkoutForm.district}>{checkoutForm.district}</option>}
              </select>
              <select
                name="ward"
                value={checkoutForm.ward}
                onChange={handleCheckoutFieldChange}
                className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Chon phuong/xa</option>
                {checkoutForm.ward && <option value={checkoutForm.ward}>{checkoutForm.ward}</option>}
              </select>
            </div>
            <input
              name="note"
              value={checkoutForm.note}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Ghi chu giao hang"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-black text-emerald-950">Hinh thuc thanh toan</h2>
            <label className="block rounded-2xl border border-emerald-200 bg-white/85 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <input type="radio" checked readOnly className="h-5 w-5 accent-emerald-800" />
                <span className="rounded-md bg-emerald-800 px-3 py-2 text-sm font-black text-white">COD</span>
                <span className="text-sm font-semibold text-emerald-950">Thanh toan khi giao hang</span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-emerald-900/70">
                <p>- Khach hang duoc kiem tra hang truoc khi nhan hang.</p>
                <p>- Freeship don tu 399K.</p>
              </div>
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <h2 className="text-2xl font-black text-emerald-950">Gio hang</h2>
            <span className="text-sm font-semibold text-emerald-900/55">{items.length} san pham</span>
          </div>

          {subtotal > 0 && subtotal < 399000 && (
            <div className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm">
              Mua them {formatCurrency(399000 - subtotal)} de duoc freeship
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}

          {items.length ? (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={`${item.productId}-${item.colorName}-${item.size}-${index}`} className="flex gap-4 rounded-2xl border border-emerald-100 bg-white/85 p-3 shadow-sm">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Link
                      to={`/products/${item.slug || item.productId}`}
                      className="line-clamp-2 text-sm font-bold text-emerald-950 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-emerald-900/55">
                      {item.colorName ? `Mau: ${item.colorName}` : 'Mau: -'} / {item.size ? `Size: ${item.size}` : 'Size: -'}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-9 items-center rounded-md border border-emerald-100 bg-emerald-50/60">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, Number(item.quantity || 1) - 1)}
                          className="h-full px-3 text-sm font-black"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, Number(item.quantity || 1) + 1)}
                          className="h-full px-3 text-sm font-black"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-900/45 hover:text-red-600"
                      >
                        Xoa
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-black text-emerald-950">
                    {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-2xl font-black text-emerald-900">
                0
              </div>
              <h3 className="mt-5 text-lg font-black text-emerald-950">Gio hang dang trong</h3>
              <p className="mt-2 text-sm text-emerald-900/60">Ve trang san pham de chon mon hang ban thich.</p>
              <Link
                to="/products"
                className="mt-5 inline-flex h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900"
              >
                Mua sam ngay
              </Link>
            </div>
          )}

          <div className="sticky bottom-0 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-emerald-900/65">
                <span>Tam tinh</span>
                <span className="font-bold text-emerald-950">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-900/65">
                <span>Phi van chuyen</span>
                <span className="font-bold text-emerald-950">{shippingFee ? formatCurrency(shippingFee) : '0d'}</span>
              </div>
              <div className="flex justify-between text-emerald-900/65">
                <span>Giam gia</span>
                <span className="font-bold text-emerald-950">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-100 pt-4 text-lg font-black text-emerald-950">
                <span>Tong cong</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={!items.length}
              className="mt-5 h-12 w-full rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thanh toan
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Cart
