import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Headphones,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  UserRound,
} from 'lucide-react'

import {
  getOrderErrorCode,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  isPendingOrder,
  orderApi,
} from '../features/order'
import { formatCurrency, getUserId } from '../features/product'
import { refundApi } from '../features/refund'
import { getApiMessage, tokenStorage } from '../shared/api'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONFIRMED', label: 'Đang giao hàng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
]

const PAGE_SIZE = 5

const sidebarItems = [
  { label: 'Thông tin tài khoản', icon: UserRound, to: '/account' },
  { label: 'Địa chỉ của tôi', icon: MapPin, to: '/account/addresses/new' },
  { label: 'Đơn hàng của tôi', icon: Package, to: '/account/orders', active: true },
  { label: 'Sản phẩm yêu thích', icon: Heart, to: '/favorites' },
  { label: 'Đổi trả & Hoàn tiền', icon: RefreshCw, to: '/account/refunds' },
  { label: 'Đổi mật khẩu', icon: KeyRound, to: '/change-password' },
]

function getDisplayName(user) {
  return user?.fullName || user?.username || user?.name || user?.email || 'Tài khoản'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} • ${hour}:${minute}`
}

function getPaymentLabel(method) {
  const map = { COD: 'COD', MOMO: 'Momo', PAYOS: 'PayOS', BANK_TRANSFER: 'Ngân hàng' }
  return map[String(method || '').toUpperCase()] || method || 'COD'
}

function getStatusDotClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PENDING') return 'bg-amber-400'
  if (s === 'CONFIRMED') return 'bg-blue-500'
  if (s === 'CANCELLED') return 'bg-red-500'
  if (s === 'RETURNED') return 'bg-neutral-400'
  return 'bg-amber-400'
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : []
}

function canRequestRefund(order) {
  const paymentMethod = String(order?.paymentMethod || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const paymentStatus = String(order?.paymentStatus || '').toUpperCase()
  const orderStatus = String(order?.status || '').toUpperCase()
  const paidStatuses = ['PAID', 'SUCCESS', 'COMPLETED', 'CAPTURED']
  const blockedStatuses = ['PENDING', 'CANCELLED', 'CANCELED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED']

  return paymentMethod === 'PAYOS' && paidStatuses.includes(paymentStatus) && !blockedStatuses.includes(orderStatus)
}

function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(status)}`} />
      {getOrderStatusLabel(status)}
    </span>
  )
}

function ProductThumbnails({ items }) {
  const visibleItems = items.slice(0, 4)
  const remaining = items.length - visibleItems.length
  const firstName = items[0]?.productName || items[0]?.productId || 'Sản phẩm'
  const extra = items.length > 1 ? `+ ${items.length - 1} sản phẩm khác` : ''

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {visibleItems.map((item, idx) => (
          <div
            key={idx}
            className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-emerald-50 shadow-sm"
            style={{ marginLeft: idx > 0 ? '-12px' : '0' }}
          >
            {item.productImage ? (
              <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-100">
                <Package className="h-5 w-5 text-emerald-400" />
              </div>
            )}
            {remaining > 0 && idx === visibleItems.length - 1 && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/50 text-[10px] font-bold text-white">
                +{remaining}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-emerald-900">{firstName}</p>
        {extra && <p className="text-xs text-emerald-500">{extra}</p>}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
            p === page
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function AccountOrders() {
  const location = useLocation()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState('')
  const [refundModalOrder, setRefundModalOrder] = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundBankForm, setRefundBankForm] = useState({
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  })
  const [refundingOrderId, setRefundingOrderId] = useState('')
  const [message, setMessage] = useState(location.state?.message || '')
  const [errorMessage, setErrorMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const user = authSnapshot.user
  const userId = getUserId(authSnapshot.user)

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (authSnapshot.isInitializing) return () => { isMounted = false }

    if (!authSnapshot.isAuthenticated || !userId) {
      Promise.resolve().then(() => { if (isMounted) setIsLoading(false) })
      return () => { isMounted = false }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
    })

    orderApi
      .getOrdersByUserId(userId)
      .then((list) => {
        if (!isMounted) return
        setOrders(
          [...list].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
          ),
        )
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Không thể tải lịch sử đơn hàng.'))
      })
      .finally(() => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [authSnapshot.isAuthenticated, authSnapshot.isInitializing, userId])

  const loadOrders = async () => {
    if (!userId) return
    setIsLoading(true)
    setErrorMessage('')
    try {
      const list = await orderApi.getOrdersByUserId(userId)
      setOrders(
        [...list].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        ),
      )
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể tải lịch sử đơn hàng.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async (order) => {
    const orderId = order?.id || order?.orderId || order?.orderCode
    if (!orderId || !isPendingOrder(order.status)) return
    const cancelReason = window.prompt('Nhập lý do hủy đơn hàng:', '')
    if (cancelReason === null) return

    setCancellingOrderId(orderId)
    setErrorMessage('')
    setMessage('')
    try {
      await orderApi.cancelOrder(orderId, cancelReason)
      setMessage(`Đã hủy đơn hàng #${order.orderCode || orderId}.`)
      await loadOrders()
    } catch (error) {
      setErrorMessage(
        getOrderErrorCode(error) === 'ORDER.INVALID_STATUS'
          ? 'Chỉ có thể hủy đơn hàng khi đơn đang chờ xử lý.'
          : getApiMessage(error, 'Không thể hủy đơn hàng.'),
      )
    } finally {
      setCancellingOrderId('')
    }
  }

  const openRefundModal = (order) => {
    const orderId = order?.id || order?.orderId || order?.orderCode
    if (!orderId || !canRequestRefund(order)) return

    setRefundModalOrder(order)
    setRefundReason('')
    setRefundAmount('')
    setRefundBankForm({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
    setErrorMessage('')
    setMessage('')
  }

  const closeRefundModal = () => {
    if (refundingOrderId) return
    setRefundModalOrder(null)
    setRefundReason('')
    setRefundAmount('')
    setRefundBankForm({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
  }

  const handleRefundSubmit = async (event) => {
    event.preventDefault()

    const order = refundModalOrder
    const orderId = order?.id || order?.orderId || order?.orderCode
    if (!orderId || !canRequestRefund(order)) return

    if (!refundReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do hoàn tiền.')
      setMessage('')
      return
    }

    const bankPayload = {
      bankCode: refundBankForm.bankCode.trim(),
      bankName: refundBankForm.bankName.trim(),
      accountNumber: refundBankForm.accountNumber.trim(),
      accountName: refundBankForm.accountName.trim(),
    }

    if (!bankPayload.bankName || !bankPayload.bankCode || !bankPayload.accountNumber || !bankPayload.accountName) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin ngân hàng nhận hoàn tiền.')
      setMessage('')
      return
    }

    const amountText = String(refundAmount || '').trim()
    const amount = amountText ? Number(amountText) : null

    if (amountText && (!Number.isFinite(amount) || amount <= 0)) {
      setErrorMessage('Số tiền hoàn phải lớn hơn 0.')
      setMessage('')
      return
    }

    setRefundingOrderId(orderId)
    setErrorMessage('')
    setMessage('')

    try {
      const payload = {
        orderId,
        reason: refundReason.trim(),
        ...bankPayload,
      }

      if (amountText) payload.refundAmount = amount

      await refundApi.requestRefund(payload)
      await refundApi.getMyRefunds().catch(() => [])
      await loadOrders()
      setRefundModalOrder(null)
      setRefundReason('')
      setRefundAmount('')
      setRefundBankForm({ bankCode: '', bankName: '', accountNumber: '', accountName: '' })
      setMessage(`Đã gửi yêu cầu hoàn tiền cho đơn hàng #${order.orderCode || orderId}.`)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể gửi yêu cầu hoàn tiền.'))
    } finally {
      setRefundingOrderId('')
    }
  }

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return orders
    return orders.filter((o) => String(o.status || '').toUpperCase() === statusFilter)
  }, [orders, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const pagedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleLogout = () => {
    tokenStorage.clear()
    window.location.href = '/login'
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="h-fit rounded-2xl border border-neutral-100 bg-white shadow-[0_8px_30px_rgba(2,44,34,0.07)]">
        {/* User info */}
        <div className="flex items-center gap-4 border-b border-neutral-100 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitial(user)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-600">Xin chào,</p>
            <p className="mt-0.5 truncate text-base font-black text-emerald-950">{getDisplayName(user)}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  item.active
                    ? 'bg-emerald-800 text-white'
                    : 'text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            Đăng xuất
          </button>
        </nav>

        {/* Support box */}
        <div className="m-4 rounded-2xl bg-emerald-50 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-800 text-white">
            <Headphones className="h-6 w-6" />
          </div>
          <p className="mt-3 font-black text-emerald-950">Bạn cần hỗ trợ?</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">Đội ngũ PoloMan luôn sẵn sàng hỗ trợ bạn!</p>
          <button className="mt-4 h-9 w-full rounded-lg border border-emerald-300 bg-white text-sm font-black text-emerald-800 hover:bg-emerald-100 transition-colors">
            Liên hệ ngay
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div>
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
          <Link to="/" className="hover:text-emerald-700">Trang chủ</Link>
          <span>›</span>
          <Link to="/account" className="hover:text-emerald-700">Tài khoản</Link>
          <span>›</span>
          <span className="font-semibold text-emerald-800">Lịch sử đơn hàng</span>
        </nav>

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-emerald-950">Lịch sử đơn hàng</h1>
            <p className="mt-1 text-sm text-emerald-900/60">
              Theo dõi và quản lý tất cả đơn hàng của bạn tại PoloMan.
            </p>
          </div>

          {/* Status filter */}
          <div className="relative w-fit shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="h-10 appearance-none rounded-xl border border-emerald-200 bg-white py-0 pl-4 pr-9 text-sm font-semibold text-emerald-800 outline-none focus:border-emerald-600 cursor-pointer"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px]">▼</span>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="font-black text-emerald-900 hover:text-emerald-700">✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Orders list */}
        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
          </div>
        ) : pagedOrders.length ? (
          <div className="space-y-4">
            {pagedOrders.map((order) => {
              const orderId = order.id || order.orderId || order.orderCode
              const isCancelling = cancellingOrderId === orderId
              const isRefunding = refundingOrderId === orderId
              const orderItems = getOrderItems(order)
              const itemCount = orderItems.length || order.itemCount || 0

              return (
                <div
                  key={order.id || order.orderCode}
                  className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_4px_16px_rgba(15,76,58,0.05)] transition-shadow hover:shadow-[0_8px_28px_rgba(15,76,58,0.10)]"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-start gap-4 border-b border-neutral-50 px-5 py-4 sm:flex-nowrap sm:items-center">
                    {/* Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <ShoppingBag className="h-5 w-5" />
                    </div>

                    {/* Order info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-emerald-950">
                        #{order.orderCode || order.id}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">{formatDate(order.createdAt)}</p>
                      <div className="mt-2">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-400">Thanh toán</p>
                      <p className="mt-1 text-sm font-black text-emerald-950">{getPaymentLabel(order.paymentMethod)}</p>
                    </div>

                    {/* Total */}
                    <div className="text-center">
                      <p className="text-xs font-semibold text-neutral-400">Tổng tiền</p>
                      <p className="mt-1 text-sm font-black text-emerald-800">{formatCurrency(order.totalAmount)}</p>
                    </div>

                    {/* Item count */}
                    {itemCount > 0 && (
                      <div className="hidden text-center sm:block">
                        <p className="text-sm font-bold text-neutral-500">{itemCount} sản phẩm</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <Link
                        to={`/account/orders/${order.id || order.orderCode}`}
                        className="flex h-9 items-center justify-center rounded-lg border border-emerald-700 px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-700 hover:text-white transition-colors"
                      >
                        Xem chi tiết
                      </Link>
                      {isPendingOrder(order.status) ? (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          disabled={isCancelling}
                          className="flex h-9 items-center justify-center rounded-lg border border-red-200 px-4 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                        >
                          {isCancelling ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      ) : canRequestRefund(order) ? (
                        <button
                          type="button"
                          onClick={() => openRefundModal(order)}
                          disabled={isRefunding}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-orange-600 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {isRefunding ? 'Đang gửi...' : 'Hoàn tiền'}
                        </button>
                      ) : (
                        <Link
                          to="/products"
                          className="flex h-9 items-center justify-center rounded-lg border border-emerald-200 px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          Mua lại
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Bottom row – product thumbnails */}
                  {orderItems.length > 0 && (
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <ProductThumbnails items={orderItems} />
                      <div className="text-right">
                        <p className="text-xs font-semibold text-neutral-400">Phương thức nhận hàng</p>
                        <p className="mt-0.5 text-xs font-bold text-emerald-800">Giao hàng tận nơi</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-300 shadow-sm">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-black text-emerald-950">
              {statusFilter ? 'Không có đơn hàng phù hợp' : 'Bạn chưa có đơn hàng nào'}
            </p>
            <p className="mt-1 text-sm text-emerald-700/60">
              {statusFilter ? 'Thử chọn trạng thái khác.' : 'Hãy khám phá sản phẩm và đặt hàng ngay!'}
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900"
            >
              Mua sắm ngay
            </Link>
          </div>
        )}

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4 backdrop-blur-sm">
          <form onSubmit={handleRefundSubmit} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Yêu cầu hoàn tiền</p>
            <h2 className="mt-2 text-2xl font-black text-emerald-950">
              Đơn hàng #{refundModalOrder.orderCode || refundModalOrder.id || refundModalOrder.orderId}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/65">
              Nếu bỏ trống số tiền hoàn, hệ thống sẽ gửi yêu cầu hoàn toàn bộ giá trị đơn hàng.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Ngân hàng</span>
                <input
                  value={refundBankForm.bankName}
                  onChange={(event) => setRefundBankForm((current) => ({ ...current, bankName: event.target.value }))}
                  disabled={Boolean(refundingOrderId)}
                  placeholder="Vietcombank"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Mã ngân hàng</span>
                <input
                  value={refundBankForm.bankCode}
                  onChange={(event) => setRefundBankForm((current) => ({ ...current, bankCode: event.target.value.toUpperCase() }))}
                  disabled={Boolean(refundingOrderId)}
                  placeholder="VCB"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm uppercase outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Số tài khoản</span>
                <input
                  value={refundBankForm.accountNumber}
                  onChange={(event) => setRefundBankForm((current) => ({ ...current, accountNumber: event.target.value }))}
                  disabled={Boolean(refundingOrderId)}
                  placeholder="0123456789"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Tên chủ tài khoản</span>
                <input
                  value={refundBankForm.accountName}
                  onChange={(event) => setRefundBankForm((current) => ({ ...current, accountName: event.target.value.toUpperCase() }))}
                  disabled={Boolean(refundingOrderId)}
                  placeholder="NGUYEN VAN A"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm uppercase outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-emerald-950">Lý do hoàn tiền</span>
              <textarea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                rows={4}
                disabled={Boolean(refundingOrderId)}
                placeholder="Ví dụ: Sản phẩm bị lỗi, giao sai sản phẩm..."
                className="resize-none rounded-2xl border border-emerald-100 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600"
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-sm font-bold text-emerald-950">Số tiền hoàn (optional)</span>
              <input
                type="number"
                min="1"
                step="1000"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                disabled={Boolean(refundingOrderId)}
                placeholder="Bỏ trống để hoàn toàn bộ"
                className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={Boolean(refundingOrderId)}
                className="h-11 rounded-xl border border-emerald-100 px-4 text-sm font-bold text-emerald-800 hover:border-emerald-500 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={Boolean(refundingOrderId)}
                className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refundingOrderId ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AccountOrders
