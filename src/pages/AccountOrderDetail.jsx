import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import {
  getOrderErrorCode,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  isPendingOrder,
  orderApi,
} from '../features/order'
import { formatCurrency, getUserId } from '../features/product'
import { getRefundStatusLabel, getRefundTypeLabel, refundApi } from '../features/refund'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

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

function getPaymentMethodLabel(method) {
  const normalizedMethod = String(method || '').toUpperCase()
  const labels = {
    COD: 'Thanh toan khi giao hang',
    MOMO: 'Vi Momo',
    PAYOS: 'PayOS QR',
    BANK_TRANSFER: 'Chuyen khoan ngan hang',
  }

  return labels[normalizedMethod] || method || 'Thanh toan khi giao hang'
}

function getPaymentStatusLabel(status) {
  const normalizedStatus = String(status || '').toUpperCase()
  const labels = {
    UNPAID: 'Chua thanh toan',
    PENDING: 'Cho thanh toan',
    PAID: 'Da thanh toan',
    FAILED: 'Thanh toan loi',
    REFUNDED: 'Da hoan tien',
  }

  return labels[normalizedStatus] || status || 'Chua thanh toan'
}

function getItemKey(item, index) {
  return [item.productId, item.colorId, item.sizeId, index].filter(Boolean).join('-')
}

function getItemProductId(item) {
  return item?.productId || item?.product?.id || item?.product?._id || ''
}

function getItemSizeId(item) {
  return item?.sizeId || item?.size?.id || item?.size?._id || ''
}

function getItemSizeOptions(item) {
  const options = item?.availableSizes || item?.sizes || item?.product?.sizes || item?.productSizes || []
  const normalized = Array.isArray(options) ? options : []
  const currentSizeId = getItemSizeId(item)
  const currentSizeName = item?.sizeName || item?.size?.name || currentSizeId
  const merged = currentSizeId
    ? [{ id: currentSizeId, name: currentSizeName, stock: item?.stock }, ...normalized]
    : normalized

  return merged.reduce((acc, size) => {
    const id = size?.id || size?._id || size?.sizeId || size?.value || size
    if (!id || acc.some((entry) => String(entry.id) === String(id))) return acc
    acc.push({
      id,
      name: size?.name || size?.sizeName || size?.label || String(id),
      stock: size?.stock ?? size?.quantity ?? size?.availableQuantity,
    })
    return acc
  }, [])
}

function AccountOrderDetail() {
  const { orderId } = useParams()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundForm, setRefundForm] = useState({
    type: 'RETURN',
    reason: '',
    refundAmount: '',
    productKey: '',
    currentSizeId: '',
    requestedSizeId: '',
    imageUrlsText: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  })
  const [refundImages, setRefundImages] = useState([])
  const [isUploadingRefundImages, setIsUploadingRefundImages] = useState(false)
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false)
  const [myRefunds, setMyRefunds] = useState([])
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const userId = getUserId(authSnapshot.user)
  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order])
  const orderRefunds = useMemo(() => {
    const orderIdentifier = String(order?.id || order?.orderId || order?.orderCode || orderId || '')
    if (!orderIdentifier) return []

    return myRefunds.filter((refund) => String(refund?.orderId || '') === orderIdentifier)
  }, [myRefunds, order, orderId])
  const canRequestRefund = useMemo(() => {
    const orderStatus = String(order?.status || '').toUpperCase()
    const allowedStatuses = ['CONFIRMED', 'SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'SUCCESS']
    const blockedStatuses = ['PENDING', 'CANCELLED', 'CANCELED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED']

    return allowedStatuses.includes(orderStatus) && !blockedStatuses.includes(orderStatus)
  }, [order])

  usePageMeta({
    title: `${order?.orderCode || orderId || 'Don hang'} | PoloMan`,
    description: 'Chi tiet don hang cua ban tai PoloMan.',
    canonicalPath: orderId ? `/account/orders/${orderId}` : '/account/orders',
  })

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (authSnapshot.isInitializing) {
      return () => {
        isMounted = false
      }
    }

    if (!authSnapshot.isAuthenticated || !orderId) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
    })

    orderApi
      .getOrder(orderId)
      .then((data) => {
        if (!isMounted) return

        if (data?.userId && userId && String(data.userId) !== String(userId)) {
          setOrder(null)
          setErrorMessage('Ban khong co quyen xem don hang nay.')
          return
        }

        setOrder(data)
        return refundApi.getMyRefunds().catch(() => [])
      })
      .then((list) => {
        if (isMounted && Array.isArray(list)) setMyRefunds(list)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai chi tiet don hang.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [authSnapshot.isAuthenticated, authSnapshot.isInitializing, orderId, userId])

  const reloadOrder = async () => {
    const data = await orderApi.getOrder(orderId)

    if (data?.userId && userId && String(data.userId) !== String(userId)) {
      setOrder(null)
      setErrorMessage('Ban khong co quyen xem don hang nay.')
      return
    }

    setOrder(data)
  }

  const reloadMyRefunds = async () => {
    const list = await refundApi.getMyRefunds()
    setMyRefunds(list)
  }

  const handleCancelOrder = async (event) => {
    event.preventDefault()

    if (!order || !isPendingOrder(order.status)) return

    setIsCancelling(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await orderApi.cancelOrder(order.id || order.orderId || order.orderCode, cancelReason.trim())
      await reloadOrder()
      setCancelModalOpen(false)
      setCancelReason('')
      setSuccessMessage('Da huy don hang thanh cong.')
    } catch (error) {
      setErrorMessage(
        getOrderErrorCode(error) === 'ORDER.INVALID_STATUS'
          ? 'Chỉ có thể hủy đơn hàng khi đơn đang chờ xử lý.'
          : getApiMessage(error, 'Khong the huy don hang.'),
      )
    } finally {
      setIsCancelling(false)
    }
  }

  const handleRefundSubmit = async (event) => {
    event.preventDefault()

    if (!order || !canRequestRefund) return
    const bankPayload = {
      bankCode: refundForm.bankCode.trim(),
      bankName: refundForm.bankName.trim(),
      accountNumber: refundForm.accountNumber.trim(),
      accountName: refundForm.accountName.trim(),
    }

    if (!refundForm.reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do trả hàng / đổi size.')
      setSuccessMessage('')
      return
    }

    if (!bankPayload.bankName || !bankPayload.bankCode || !bankPayload.accountNumber || !bankPayload.accountName) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin ngân hàng.')
      setSuccessMessage('')
      return
    }

    const orderIdentifier = order.id || order.orderId || order.orderCode || orderId
    const amountText = String(refundForm.refundAmount || '').trim()
    const amount = amountText ? Number(amountText) : Number(order.totalAmount || 0)

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Số tiền cần hoàn phải lớn hơn 0.')
      setSuccessMessage('')
      return
    }

    const selectedItem = items.find((item, index) => getItemKey(item, index) === refundForm.productKey)
    if (refundForm.type === 'EXCHANGE_SIZE') {
      if (!selectedItem || !refundForm.currentSizeId || !refundForm.requestedSizeId) {
        setErrorMessage('Vui lòng chọn sản phẩm, size hiện tại và size muốn đổi.')
        setSuccessMessage('')
        return
      }
      if (String(refundForm.currentSizeId) === String(refundForm.requestedSizeId)) {
        setErrorMessage('Size muốn đổi phải khác size hiện tại.')
        setSuccessMessage('')
        return
      }
    }

    setIsSubmittingRefund(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const typedImageUrls = refundForm.imageUrlsText
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean)
      const payload = {
        orderId: orderIdentifier,
        type: refundForm.type,
        refundAmount: amount,
        reason: refundForm.reason.trim(),
        imageUrls: [...refundImages.map((image) => image.url), ...typedImageUrls],
        ...bankPayload,
      }

      if (refundForm.type === 'EXCHANGE_SIZE') {
        payload.productId = getItemProductId(selectedItem)
        payload.currentSizeId = refundForm.currentSizeId
        payload.requestedSizeId = refundForm.requestedSizeId
      }

      await refundApi.requestRefund(payload)
      await Promise.all([reloadOrder(), reloadMyRefunds()])
      setRefundModalOpen(false)
      setRefundForm({
        type: 'RETURN',
        reason: '',
        refundAmount: '',
        productKey: '',
        currentSizeId: '',
        requestedSizeId: '',
        imageUrlsText: '',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
      })
      setRefundImages([])
      setSuccessMessage('Đã gửi yêu cầu trả hàng / đổi size thành công.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể gửi yêu cầu trả hàng / đổi size.'))
    } finally {
      setIsSubmittingRefund(false)
    }
  }

  const handleRefundImageUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setIsUploadingRefundImages(true)
    setErrorMessage('')

    try {
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          const data = await uploadImageToCloudinary(file, 'REFUND')
          return { url: data.secure_url || data.url, name: file.name }
        }),
      )
      setRefundImages((current) => [...current, ...uploadedImages.filter((image) => image.url)])
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể tải ảnh bằng chứng.')
    } finally {
      setIsUploadingRefundImages(false)
      event.target.value = ''
    }
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-emerald-700/65">
            <Link to="/account/orders" className="font-semibold hover:text-emerald-900">
              Lich su don hang
            </Link>
            <span className="mx-2">/</span>
            <span>Chi tiet</span>
          </p>
          <h1 className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">
            Don hang #{order?.orderCode || order?.id || orderId}
          </h1>
        </div>
        <Link
          to="/account/orders"
          className="h-10 w-fit rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
        >
          Quay lai
        </Link>
      </div>

      {successMessage && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      ) : order ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="bg-[linear-gradient(135deg,#064e3b_0%,#047857_100%)] p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Trang thai don hang</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-2xl font-black">{getOrderStatusLabel(order.status)}</p>
                    <p className="mt-1 text-sm text-white/65">Dat luc {formatDate(order.createdAt)}</p>
                  </div>
                  {isPendingOrder(order.status) && (
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      className="h-10 w-fit rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-white/18"
                    >
                      Huy don
                    </button>
                  )}
                </div>
              </div>
              <div className="p-5">
              <div className="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-500">Ma don</p>
                  <p className="mt-2 text-lg font-black text-emerald-950">#{order?.orderCode || order?.id || orderId}</p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${getOrderStatusBadgeClass(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/60">Nguoi nhan</p>
                  <p className="mt-2 text-sm font-bold text-emerald-950">{order.receiverName || 'Chua cap nhat'}</p>
                  <p className="mt-1 text-sm text-emerald-800/70">{order.receiverPhone || 'Chua cap nhat'}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/60">Dia chi giao hang</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-950">
                    {order.receiverAddress || 'Chua cap nhat'}
                  </p>
                </div>
              </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">San pham trong don</h2>
              <div className="mt-4 divide-y divide-emerald-100">
                {items.length ? (
                  items.map((item, index) => (
                    <div key={getItemKey(item, index)} className="flex gap-4 py-4">
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName || 'San pham'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-emerald-900/35">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold text-emerald-950">
                          {item.productName || item.productId || 'San pham'}
                        </p>
                        <p className="mt-1 text-xs text-emerald-900/55">
                          {item.colorName ? `Mau: ${item.colorName}` : 'Mau: -'} / {item.sizeName ? `Size: ${item.sizeName}` : 'Size: -'}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-emerald-800">
                          {formatCurrency(item.unitPrice)} x {Number(item.quantity || 0)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-emerald-950">
                        {formatCurrency(item.totalPrice || Number(item.unitPrice || 0) * Number(item.quantity || 0))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm font-semibold text-emerald-700/60">Don hang chua co san pham.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">Thanh toan</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-emerald-900/70">
                  <span>Phuong thuc</span>
                  <span className="text-right font-bold text-emerald-950">{getPaymentMethodLabel(order.paymentMethod)}</span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-900/70">
                  <span>Trang thai</span>
                  <span className="text-right font-bold text-emerald-950">{getPaymentStatusLabel(order.paymentStatus)}</span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-900/70">
                  <span>Tam tinh</span>
                  <span className="font-bold text-emerald-950">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-900/70">
                  <span>Phi van chuyen</span>
                  <span className="font-bold text-emerald-950">{formatCurrency(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-900/70">
                  <span>Giam gia</span>
                  <span className="font-bold text-emerald-950">-{formatCurrency(order.discountAmount)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-emerald-100 pt-4 text-lg font-black text-emerald-950">
                  <span>Tong cong</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-emerald-950">Hoan tien</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-900/60">
                    Yeu cau hoan tien ap dung cho don hang da thanh toan qua PayOS.
                  </p>
                </div>
                {orderRefunds.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {orderRefunds.length} yeu cau
                  </span>
                )}
              </div>

              {orderRefunds.length > 0 && (
                <div className="mt-4 space-y-2">
                  {orderRefunds.slice(0, 2).map((refund, index) => (
                    <div key={refund?.id || refund?.refundId || index} className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
                      <p className="font-black text-neutral-950">{getRefundTypeLabel(refund.type)} - {formatCurrency(refund.refundAmount)}</p>
                      <p className="mt-1">Trạng thái: <span className="font-bold">{getRefundStatusLabel(refund.status)}</span></p>
                    </div>
                  ))}
                  <Link to="/account/refunds" className="inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900">
                    Xem tất cả yêu cầu trả/đổi hàng
                  </Link>
                </div>
              )}

              {canRequestRefund ? (
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(true)}
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-800"
                >
                  Trả hàng / Đổi size
                </button>
              ) : (
                <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                  Đơn hàng chưa đủ điều kiện gửi yêu cầu trả hàng / đổi size. Nếu đơn chưa được admin xác nhận, bạn dùng flow hủy đơn.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">Van chuyen</h2>
              <div className="mt-4 space-y-3 text-sm text-emerald-900/70">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Don vi</p>
                  <p className="mt-1 font-bold text-emerald-950">{order.shippingProvider || 'Chua cap nhat'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Ma van don</p>
                  <p className="mt-1 font-bold text-emerald-950">{order.trackingCode || 'Chua cap nhat'}</p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/55">Ghi chu</p>
                    <p className="mt-1 leading-6 text-emerald-950">{order.note}</p>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-600">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">Ly do huy</p>
                    <p className="mt-1 leading-6">{order.cancelReason}</p>
                  </div>
                )}
              </div>
            </div>

            {isPendingOrder(order.status) && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="flex h-12 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black uppercase tracking-[0.12em] text-red-600 hover:border-red-400"
              >
                Huy don hang
              </button>
            )}
          </aside>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center">
          <p className="text-base font-semibold text-emerald-800">Khong tim thay don hang.</p>
          <Link
            to="/account/orders"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            Ve lich su don hang
          </Link>
        </div>
      )}

      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4 backdrop-blur-sm">
          <form onSubmit={handleRefundSubmit} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Yeu cau hoan tien</p>
            <h2 className="mt-2 text-2xl font-black text-emerald-950">
              Don hang #{order?.orderCode || order?.id || orderId}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/65">
              Neu bo trong so tien hoan, he thong se gui yeu cau hoan toan bo gia tri don hang.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['RETURN', 'Trả hàng hoàn tiền'],
                ['EXCHANGE_SIZE', 'Đổi size'],
              ].map(([value, label]) => (
                <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-black ${refundForm.type === value ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-emerald-100 text-neutral-600'}`}>
                  <input
                    type="radio"
                    name="refundType"
                    value={value}
                    checked={refundForm.type === value}
                    onChange={() => setRefundForm((current) => ({ ...current, type: value, productKey: '', currentSizeId: '', requestedSizeId: '' }))}
                    disabled={isSubmittingRefund}
                    className="h-4 w-4 accent-emerald-700"
                  />
                  {label}
                </label>
              ))}
            </div>

            {refundForm.type === 'EXCHANGE_SIZE' && (
              <div className="mt-5 grid gap-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:grid-cols-3">
                <label className="grid gap-2 sm:col-span-3">
                  <span className="text-sm font-bold text-emerald-950">Sản phẩm muốn đổi size</span>
                  <select
                    value={refundForm.productKey}
                    onChange={(event) => {
                      const productKey = event.target.value
                      const item = items.find((entry, index) => getItemKey(entry, index) === productKey)
                      setRefundForm((current) => ({ ...current, productKey, currentSizeId: getItemSizeId(item), requestedSizeId: '' }))
                    }}
                    disabled={isSubmittingRefund}
                    className="h-12 rounded-2xl border border-emerald-100 bg-white px-4 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Chọn sản phẩm trong đơn</option>
                    {items.map((item, index) => (
                      <option key={getItemKey(item, index)} value={getItemKey(item, index)}>
                        {item.productName || item.productId || 'Sản phẩm'} - size {item.sizeName || getItemSizeId(item) || '-'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-emerald-950">Size hiện tại</span>
                  <select
                    value={refundForm.currentSizeId}
                    onChange={(event) => setRefundForm((current) => ({ ...current, currentSizeId: event.target.value }))}
                    disabled={isSubmittingRefund || !refundForm.productKey}
                    className="h-12 rounded-2xl border border-emerald-100 bg-white px-4 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Chọn size</option>
                    {getItemSizeOptions(items.find((item, index) => getItemKey(item, index) === refundForm.productKey)).map((size) => (
                      <option key={size.id} value={size.id}>{size.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-bold text-emerald-950">Size muốn đổi</span>
                  <select
                    value={refundForm.requestedSizeId}
                    onChange={(event) => setRefundForm((current) => ({ ...current, requestedSizeId: event.target.value }))}
                    disabled={isSubmittingRefund || !refundForm.productKey}
                    className="h-12 rounded-2xl border border-emerald-100 bg-white px-4 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Chọn size khác cùng sản phẩm</option>
                    {getItemSizeOptions(items.find((item, index) => getItemKey(item, index) === refundForm.productKey))
                      .filter((size) => String(size.id) !== String(refundForm.currentSizeId))
                      .map((size) => (
                        <option key={size.id} value={size.id}>{size.name}{Number(size.stock) <= 0 ? ' - có thể hết hàng' : ''}</option>
                      ))}
                  </select>
                </label>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Ngân hàng</span>
                <input
                  value={refundForm.bankName}
                  onChange={(event) => setRefundForm((current) => ({ ...current, bankName: event.target.value }))}
                  disabled={isSubmittingRefund}
                  placeholder="Vietcombank"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Mã ngân hàng</span>
                <input
                  value={refundForm.bankCode}
                  onChange={(event) => setRefundForm((current) => ({ ...current, bankCode: event.target.value.toUpperCase() }))}
                  disabled={isSubmittingRefund}
                  placeholder="VCB"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm uppercase outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Số tài khoản</span>
                <input
                  value={refundForm.accountNumber}
                  onChange={(event) => setRefundForm((current) => ({ ...current, accountNumber: event.target.value }))}
                  disabled={isSubmittingRefund}
                  placeholder="0123456789"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Tên chủ tài khoản</span>
                <input
                  value={refundForm.accountName}
                  onChange={(event) => setRefundForm((current) => ({ ...current, accountName: event.target.value.toUpperCase() }))}
                  disabled={isSubmittingRefund}
                  placeholder="NGUYEN VAN A"
                  className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm uppercase outline-none focus:border-emerald-600"
                />
              </label>
            </div>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-emerald-950">Ly do hoan tien</span>
              <textarea
                value={refundForm.reason}
                onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                rows={4}
                disabled={isSubmittingRefund}
                placeholder="Vi du: San pham bi loi, don hang giao sai..."
                className="resize-none rounded-2xl border border-emerald-100 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600"
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Ảnh bằng chứng</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRefundImageUpload}
                  disabled={isSubmittingRefund || isUploadingRefundImages}
                  className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-emerald-950">Image URL</span>
                <textarea
                  value={refundForm.imageUrlsText}
                  onChange={(event) => setRefundForm((current) => ({ ...current, imageUrlsText: event.target.value }))}
                  rows={3}
                  disabled={isSubmittingRefund}
                  placeholder="Mỗi dòng một URL ảnh"
                  className="resize-none rounded-2xl border border-emerald-100 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600"
                />
              </label>
            </div>
            {refundImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {refundImages.map((image) => (
                  <div key={image.url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                    <img src={image.url} alt={image.name || 'Ảnh bằng chứng'} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRefundImages((current) => current.filter((entry) => entry.url !== image.url))}
                      className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-xs font-black text-red-600"
                      aria-label="Xóa ảnh"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="mt-4 grid gap-2">
              <span className="text-sm font-bold text-emerald-950">So tien hoan (optional)</span>
              <input
                type="number"
                min="1"
                step="1000"
                value={refundForm.refundAmount}
                onChange={(event) => setRefundForm((current) => ({ ...current, refundAmount: event.target.value }))}
                disabled={isSubmittingRefund}
                placeholder="Bo trong de hoan toan bo"
                className="h-12 rounded-2xl border border-emerald-100 px-4 text-sm outline-none focus:border-emerald-600"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRefundModalOpen(false)
                }}
                disabled={isSubmittingRefund}
                className="h-11 rounded-xl border border-emerald-100 px-4 text-sm font-bold text-emerald-800 hover:border-emerald-500 disabled:opacity-60"
              >
                Huy
              </button>
              <button
                type="submit"
                disabled={isSubmittingRefund}
                className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingRefund ? 'Dang gui...' : 'Gui yeu cau'}
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4 backdrop-blur-sm">
          <form onSubmit={handleCancelOrder} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Huy don hang</p>
            <h2 className="mt-2 text-2xl font-black text-emerald-950">
              Ban muon huy don #{order?.orderCode || order?.id || orderId}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/65">
              Don chi co the huy khi dang o trang thai cho xac nhan. Ly do huy se duoc gui len he thong neu ban nhap.
            </p>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-emerald-950">Ly do huy</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={4}
                placeholder="Vi du: Dat nham size, muon doi dia chi giao hang..."
                className="resize-none rounded-2xl border border-emerald-100 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={isCancelling}
                className="h-11 rounded-xl border border-emerald-100 px-4 text-sm font-bold text-emerald-800 hover:border-emerald-500 disabled:opacity-60"
              >
                Khong huy
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="h-11 rounded-xl bg-red-600 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? 'Dang huy...' : 'Xac nhan huy'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AccountOrderDetail
