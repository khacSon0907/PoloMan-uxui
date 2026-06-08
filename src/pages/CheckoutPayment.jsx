import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'

import { orderApi } from '../features/order'
import { formatCurrency } from '../features/product'
import { getApiMessage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'
import { subscribePaymentStatus } from '../shared/services/paymentSocket'

function readStoredPayment() {
  try {
    const raw = sessionStorage.getItem('poloman:checkout-payment')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getItemImage(item) {
  return item?.productImage || item?.image || ''
}

function getItemName(item) {
  return item?.productName || item?.name || item?.productId || 'San pham'
}

function getItemQuantity(item) {
  return Number(item?.quantity || 0)
}

function getItemTotal(item) {
  return Number(item?.totalPrice || 0) || Number(item?.unitPrice || item?.price || 0) * getItemQuantity(item)
}

function getCreateOrderItems(items) {
  return items.map((item) => ({
    productId: item.productId || '',
    productName: item.productName || item.name || '',
    productImage: item.productImage || item.image || '',
    colorId: item.colorId || '',
    colorName: item.colorName || '',
    sizeId: item.sizeId || '',
    sizeName: item.sizeName || item.size || '',
    quantity: Number(item.quantity || 1),
  }))
}

function CheckoutPayment() {
  const location = useLocation()
  const navigate = useNavigate()
  const socketCleanupRef = useRef(null)
  const payload = useMemo(() => location.state || readStoredPayment(), [location.state])
  const order = payload?.order
  const payment = order?.payment
  const items = Array.isArray(payload?.items) ? payload.items : []
  const [socketStatus, setSocketStatus] = useState('connecting')
  const [statusMessage, setStatusMessage] = useState('Dang ket noi cong thanh toan...')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreatingCodOrder, setIsCreatingCodOrder] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  usePageMeta({
    title: 'Thanh toan QR | PoloMan',
    description: 'Quet ma QR de thanh toan don hang PoloMan.',
    canonicalPath: '/checkout/payment',
  })

  useEffect(() => {
    if (!payment?.orderId) return undefined

    Promise.resolve().then(() => {
      setSocketStatus('connecting')
      setStatusMessage('Dang ket noi cong thanh toan...')
      setErrorMessage('')
    })

    const cleanup = subscribePaymentStatus(payment.orderId, {
      onConnect: () => {
        setSocketStatus('connected')
        setStatusMessage('Dang cho xac nhan thanh toan tu PayOS.')
      },
      onMessage: (message) => {
        const nextStatus = String(message?.paymentStatus || '').toUpperCase()

        if (nextStatus === 'PAID') {
          setSocketStatus('paid')
          setStatusMessage(message?.message || 'Thanh toan thanh cong.')
          sessionStorage.removeItem('poloman:checkout-payment')
          socketCleanupRef.current?.()
          socketCleanupRef.current = null

          window.setTimeout(() => {
            navigate(`/account/orders/${message?.orderId || payment.orderId || order.id}`, { replace: true })
          }, 900)
          return
        }

        if (nextStatus === 'FAILED') {
          setSocketStatus('failed')
          setErrorMessage(message?.message || 'Thanh toan that bai. Vui long thu lai hoac doi sang COD.')
          socketCleanupRef.current?.()
          socketCleanupRef.current = null
        }
      },
      onError: (error) => {
        setSocketStatus('error')
        setErrorMessage(error?.message || 'Khong the ket noi trang thai thanh toan.')
      },
    })

    socketCleanupRef.current = cleanup

    return () => {
      cleanup()
      socketCleanupRef.current = null
    }
  }, [navigate, order?.id, payment?.orderId, retryCount])

  const handleRetryPayment = () => {
    setSocketStatus('connecting')
    setErrorMessage('')
    setStatusMessage('Dang ket noi lai cong thanh toan...')
    setRetryCount((current) => current + 1)
  }

  const handleSwitchToCod = async () => {
    if (!order) return

    setIsCreatingCodOrder(true)
    setErrorMessage('')

    try {
      const codOrder = await orderApi.createOrder({
        userId: order.userId,
        receiverName: order.receiverName,
        receiverPhone: order.receiverPhone,
        receiverAddress: order.receiverAddress,
        items: getCreateOrderItems(items),
        shippingFee: order.shippingFee,
        discountAmount: order.discountAmount,
        paymentMethod: 'COD',
        note: order.note,
      })

      sessionStorage.removeItem('poloman:checkout-payment')
      navigate('/account/orders', {
        replace: true,
        state: {
          message: `Da doi sang COD${codOrder?.orderCode ? `: ${codOrder.orderCode}` : ''}.`,
        },
      })
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the doi sang COD.'))
    } finally {
      setIsCreatingCodOrder(false)
    }
  }

  if (!order || !payment?.qrCode) {
    return <Navigate to="/cart" replace />
  }

  const orderNumber = order.orderCode || payment.orderCode || order.id
  const paymentAmount = payment.amount || order.totalAmount
  const isPaid = socketStatus === 'paid'
  const isFailed = socketStatus === 'failed'

  return (
    <div className="space-y-6 rounded-3xl bg-[linear-gradient(135deg,#fbfdf8_0%,#f1f8ee_52%,#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <Link to="/cart" className="hover:text-emerald-900">
          Gio hang
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">Thanh toan QR</span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-5 border-b border-emerald-100 bg-emerald-900 px-5 py-6 text-white sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70">PoloMan PayOS</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Quet ma QR de chuyen khoan</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/75">
              Don hang da duoc tao tren he thong PoloMan. Hay quet ma QR va chuyen dung so tien ben duoi.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100/65">Ma don</p>
            <p className="mt-1 text-xl font-black">#{orderNumber}</p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Nguoi nhan</p>
                  <p className="mt-2 text-sm font-black text-emerald-950">{order.receiverName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Dien thoai</p>
                  <p className="mt-2 text-sm font-black text-emerald-950">{order.receiverPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Tong tien</p>
                  <p className="mt-2 text-sm font-black text-emerald-950">{formatCurrency(paymentAmount)}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-emerald-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Dia chi giao hang</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-950">{order.receiverAddress || '-'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 border-b border-emerald-100 pb-3">
                <h2 className="text-lg font-black text-emerald-950">San pham trong don</h2>
                <span className="text-sm font-semibold text-emerald-900/55">{items.length} san pham</span>
              </div>
              <div className="divide-y divide-emerald-100">
                {items.map((item, index) => (
                  <div key={`${item.productId || item.name}-${index}`} className="flex gap-4 py-4">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                      {getItemImage(item) ? (
                        <img src={getItemImage(item)} alt={getItemName(item)} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-emerald-900/35">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-black text-emerald-950">{getItemName(item)}</p>
                      <p className="mt-1 text-xs text-emerald-900/55">
                        {item.colorName ? `Mau: ${item.colorName}` : 'Mau: -'} / {item.sizeName || item.size ? `Size: ${item.sizeName || item.size}` : 'Size: -'}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-800">So luong: {getItemQuantity(item)}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-950">{formatCurrency(getItemTotal(item))}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside>
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
              <div className="bg-emerald-50/80 px-5 py-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">VietQR PayOS</p>
                <h2 className="mt-1 text-lg font-black text-emerald-950">Quet ma thanh toan</h2>
                <p className="mt-1 text-xs font-semibold text-emerald-900/55">Dung app ngan hang de quet QR.</p>
              </div>

              <div className="p-5">
                <div className="mx-auto flex max-w-80 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_18px_50px_rgba(20,83,45,0.12)]">
                  <QRCodeCanvas value={payment.qrCode} size={288} level="M" includeMargin className="h-auto w-full" />
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-emerald-100">
                  <div className="grid grid-cols-[110px_1fr] border-b border-emerald-100 text-sm">
                    <span className="bg-emerald-50/80 px-3 py-3 font-bold text-emerald-900/60">Ma don</span>
                    <span className="break-all px-3 py-3 text-right font-black text-emerald-950">#{orderNumber}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="bg-emerald-50/80 px-3 py-3 font-bold text-emerald-900/60">So tien</span>
                    <span className="px-3 py-3 text-right text-base font-black text-emerald-950">{formatCurrency(paymentAmount)}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                  Vui long chuyen dung so tien {formatCurrency(paymentAmount)} va giu nguyen noi dung ma don #{orderNumber}.
                </div>

                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold leading-6 ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-700'
                      : isFailed
                        ? 'bg-red-50 text-red-600'
                        : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  {errorMessage || statusMessage}
                </div>

                {payment.checkoutUrl && !isPaid && (
                  <a
                    href={payment.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-emerald-200 px-5 text-sm font-bold text-emerald-800 hover:border-emerald-600"
                  >
                    Mo trang thanh toan PayOS
                  </a>
                )}

                {isFailed && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={handleRetryPayment}
                      className="h-11 rounded-lg border border-emerald-200 px-5 text-sm font-bold text-emerald-800 hover:border-emerald-600"
                    >
                      Thu lai QR
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToCod}
                      disabled={isCreatingCodOrder}
                      className="h-11 rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingCodOrder ? 'Dang doi...' : 'Doi sang COD'}
                    </button>
                  </div>
                )}

                <Link
                  to="/account/orders"
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
                >
                  Xem don hang
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default CheckoutPayment
