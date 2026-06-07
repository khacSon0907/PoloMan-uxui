import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { orderApi } from '../features/order'
import { formatCurrency, getUserId } from '../features/product'
import { getApiMessage, tokenStorage } from '../shared/api'

function formatDate(value) {
  if (!value) return 'Chua cap nhat'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chua cap nhat'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusLabel(status) {
  const normalizedStatus = String(status || '').toUpperCase()
  const labels = {
    PENDING: 'Cho xac nhan',
    CONFIRMED: 'Da xac nhan',
    SHIPPING: 'Dang giao',
    DELIVERED: 'Da giao',
    COMPLETED: 'Hoan thanh',
    CANCELLED: 'Da huy',
  }

  return labels[normalizedStatus] || status || 'Cho xac nhan'
}

function getPaymentLabel(method) {
  const normalizedMethod = String(method || '').toUpperCase()
  const labels = {
    COD: 'COD',
    MOMO: 'Momo',
    BANK_TRANSFER: 'Ngan hang',
  }

  return labels[normalizedMethod] || method || 'COD'
}

function getOrderItemsText(order) {
  const items = Array.isArray(order?.items) ? order.items : []

  if (!items.length) return 'Chua co san pham'

  return items
    .map((item) => {
      const name = item.productName || item.productId || 'San pham'
      const quantity = Number(item.quantity || 0)
      return quantity > 1 ? `${name} x${quantity}` : name
    })
    .join(', ')
}

function AccountOrders() {
  const location = useLocation()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState(location.state?.message || '')
  const [errorMessage, setErrorMessage] = useState('')
  const userId = getUserId(authSnapshot.user)

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (authSnapshot.isInitializing) return () => {
      isMounted = false
    }

    if (!authSnapshot.isAuthenticated || !userId) {
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    setIsLoading(true)
    setErrorMessage('')

    orderApi
      .getOrdersByUserId(userId)
      .then((list) => {
        if (!isMounted) return

        setOrders(
          [...list].sort(
            (first, second) =>
              new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime(),
          ),
        )
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai lich su don hang.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [authSnapshot.isAuthenticated, authSnapshot.isInitializing, userId])

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-emerald-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Tai khoan</p>
            <h1 className="mt-2 text-2xl font-semibold text-emerald-800">Lich su don hang</h1>
            <p className="mt-1 text-sm text-emerald-600">Theo doi cac don hang da dat tai PoloMan.</p>
          </div>
          <Link
            to="/account"
            className="h-10 w-fit rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
          >
            Thong tin ca nhan
          </Link>
        </div>

        {message && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="font-black text-emerald-900">
              x
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 divide-y divide-emerald-100 border-y border-emerald-100">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
            </div>
          ) : orders.length ? (
            orders.map((order) => (
              <div
                key={order.id || order.orderCode}
                className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:gap-4 lg:grid-cols-[160px_1fr_140px_120px_150px_100px] lg:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-emerald-800">#{order.orderCode || order.id}</p>
                  <p className="mt-1 text-xs text-emerald-500">{formatDate(order.createdAt)}</p>
                </div>
                <p className="text-sm text-emerald-600 sm:col-span-2 lg:col-span-1">{getOrderItemsText(order)}</p>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {getStatusLabel(order.status)}
                </span>
                <span className="text-sm font-semibold text-emerald-700">{getPaymentLabel(order.paymentMethod)}</span>
                <p className="text-sm font-semibold text-emerald-800 sm:text-right">
                  {formatCurrency(order.totalAmount)}
                </p>
                <Link
                  to={`/account/orders/${order.id || order.orderCode}`}
                  className="h-9 w-fit rounded-md border border-emerald-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 hover:border-emerald-500 hover:text-emerald-900 lg:justify-self-end"
                >
                  Chi tiet
                </Link>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-base font-semibold text-emerald-800">Ban chua co don hang nao.</p>
              <Link
                to="/products"
                className="mt-4 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Mua sam ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountOrders
