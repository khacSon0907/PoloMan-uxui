import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { cartStorage, CART_UPDATED_EVENT, formatCurrency } from '../features/product'
import { usePageMeta } from '../shared/hooks/usePageMeta'

function Cart() {
  const [items, setItems] = useState(() => cartStorage.getItems())

  usePageMeta({
    title: 'Gio hang cua ban | PoloMan',
    description: 'Kiem tra gio hang va thong tin giao hang.',
    canonicalPath: '/cart',
  })

  useEffect(() => {
    const syncCart = () => setItems(cartStorage.getItems())

    window.addEventListener(CART_UPDATED_EVENT, syncCart)
    window.addEventListener('storage', syncCart)

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  )
  const shippingFee = subtotal >= 399000 || subtotal === 0 ? 0 : 30000
  const discount = subtotal >= 799000 ? 50000 : subtotal >= 499000 ? 20000 : 0
  const total = Math.max(0, subtotal + shippingFee - discount)

  const handleQuantityChange = (index, quantity) => {
    cartStorage.updateQuantity(index, quantity)
    setItems(cartStorage.getItems())
  }

  const handleRemove = (index) => {
    cartStorage.removeItem(index)
    setItems(cartStorage.getItems())
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
            <p className="mt-2 text-sm text-emerald-900/60">Nhap thong tin giao hang de hoan tat don hang.</p>
          </div>

          <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm">
            <input
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Ho va ten"
            />
            <input
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="So dien thoai"
            />
            <input
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Dia chi"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600">
                <option>Chon tinh/thanh pho</option>
              </select>
              <select className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600">
                <option>Chon quan/huyen</option>
              </select>
              <select className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600">
                <option>Chon phuong/xa</option>
              </select>
            </div>
            <input
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
