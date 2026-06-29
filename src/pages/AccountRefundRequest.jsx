import { useEffect, useMemo, useState } from 'react'
import { Banknote, CheckCircle2, ImagePlus, PackageCheck, RefreshCw, X } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { orderApi } from '../features/order'
import { formatCurrency, getUserId } from '../features/product'
import { getRefundTypeLabel, refundApi } from '../features/refund'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

function getItemKey(item, index) {
  return [item.productId, item.colorId, item.sizeId, index].filter(Boolean).join('-')
}

function getItemProductId(item) {
  return item?.productId || item?.product?.id || item?.product?._id || ''
}

function getItemSizeId(item) {
  return item?.sizeId || item?.size?.id || item?.size?._id || ''
}

function getItemImage(item) {
  return item?.productImage || item?.imageUrl || item?.thumbnailUrl || item?.product?.imageUrl || item?.product?.thumbnailUrl || ''
}

function getItemColorName(item) {
  return item?.colorName || item?.color?.name || item?.color?.colorName || '-'
}

function getItemSizeName(item) {
  return item?.sizeName || item?.size?.name || item?.size?.sizeName || getItemSizeId(item) || '-'
}

function getItemAmount(item) {
  const total = Number(item?.totalPrice)
  if (Number.isFinite(total) && total > 0) return total
  return Number(item?.unitPrice || 0) * Number(item?.quantity || 1)
}

function getRefundAmountForItem(item, order) {
  if (!item) return 0

  const itemAmount = getItemAmount(item)
  const orderTotal = Number(order?.totalAmount || 0)
  const subtotal = Number(order?.subtotal || 0)

  if (!Number.isFinite(itemAmount) || itemAmount <= 0) return 0
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return itemAmount
  if (itemAmount <= orderTotal && (!subtotal || orderTotal >= subtotal)) return itemAmount
  if (!subtotal || subtotal <= 0 || itemAmount >= subtotal) return Math.min(itemAmount, orderTotal)

  return Math.max(1, Math.round((itemAmount / subtotal) * orderTotal))
}

function getItemLabel(item) {
  if (!item) return ''
  return `${item.productName || item.productId || 'Sản phẩm'} - màu ${getItemColorName(item)} - size ${getItemSizeName(item)}`
}

function getItemSizeOptions(item) {
  const options = item?.availableSizes || item?.sizes || item?.product?.sizes || item?.productSizes || []
  const normalized = Array.isArray(options) ? options : []
  const currentSizeId = getItemSizeId(item)
  const currentSizeName = getItemSizeName(item)
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

function canRequestRefund(order) {
  const orderStatus = String(order?.status || '').toUpperCase()
  const allowedStatuses = ['CONFIRMED', 'SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'SUCCESS']
  const blockedStatuses = ['PENDING', 'CANCELLED', 'CANCELED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED']

  return allowedStatuses.includes(orderStatus) && !blockedStatuses.includes(orderStatus)
}

function AccountRefundRequest() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [refundImages, setRefundImages] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({
    type: 'RETURN',
    reason: '',
    productKey: '',
    currentSizeId: '',
    requestedSizeId: '',
    imageUrlsText: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  })
  const userId = getUserId(authSnapshot.user)
  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order])
  const selectedItem = useMemo(
    () => items.find((item, index) => getItemKey(item, index) === form.productKey),
    [form.productKey, items],
  )
  const selectedAmount = selectedItem ? getRefundAmountForItem(selectedItem, order) : 0
  const selectedOriginalAmount = selectedItem ? getItemAmount(selectedItem) : 0
  const isExchangeSize = form.type === 'EXCHANGE_SIZE'

  usePageMeta({
    title: `Yêu cầu trả hàng | ${order?.orderCode || orderId || 'PoloMan'}`,
    description: 'Gửi yêu cầu trả hàng hoặc đổi size cho đơn hàng PoloMan.',
    canonicalPath: orderId ? `/account/orders/${orderId}/refund` : '/account/orders',
  })

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (authSnapshot.isInitializing) return () => { isMounted = false }

    if (!authSnapshot.isAuthenticated || !orderId) {
      Promise.resolve().then(() => { if (isMounted) setIsLoading(false) })
      return () => { isMounted = false }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
    })

    orderApi
      .getOrder(orderId)
      .then((data) => {
        if (!isMounted) return
        if (data?.userId && userId && String(data.userId) !== String(userId)) {
          setOrder(null)
          setErrorMessage('Bạn không có quyền xem đơn hàng này.')
          return
        }
        setOrder(data)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Không thể tải chi tiết đơn hàng.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [authSnapshot.isAuthenticated, authSnapshot.isInitializing, orderId, userId])

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setIsUploadingImages(true)
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
      setIsUploadingImages(false)
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!order || !canRequestRefund(order)) return

    if (!selectedItem) {
      setErrorMessage('Vui lòng chọn sản phẩm cần trả hàng / đổi size.')
      return
    }

    if (!form.reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do trả hàng / đổi size.')
      return
    }

    if (isExchangeSize) {
      if (!form.currentSizeId || !form.requestedSizeId) {
        setErrorMessage('Vui lòng chọn size hiện tại và size muốn đổi.')
        return
      }
      if (String(form.currentSizeId) === String(form.requestedSizeId)) {
        setErrorMessage('Size muốn đổi phải khác size hiện tại.')
        return
      }
    } else if (!form.bankName.trim() || !form.bankCode.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin nhận tiền.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const typedImageUrls = form.imageUrlsText
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean)
      const payload = {
        orderId: order.id || order.orderId || order.orderCode || orderId,
        type: form.type,
        reason: form.reason.trim(),
        imageUrls: [...refundImages.map((image) => image.url), ...typedImageUrls],
        productId: getItemProductId(selectedItem),
        currentSizeId: form.currentSizeId || getItemSizeId(selectedItem),
      }

      if (isExchangeSize) {
        payload.requestedSizeId = form.requestedSizeId
      } else {
        payload.refundAmount = selectedAmount
        payload.bankCode = form.bankCode.trim()
        payload.bankName = form.bankName.trim()
        payload.accountNumber = form.accountNumber.trim()
        payload.accountName = form.accountName.trim()
      }

      await refundApi.requestRefund(payload)
      navigate('/account/refunds', { replace: true })
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể gửi yêu cầu trả hàng / đổi size.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-5 flex items-center gap-2 text-xs text-neutral-500">
        <Link to="/account/orders" className="hover:text-emerald-700">Đơn hàng của tôi</Link>
        <span>/</span>
        <Link to={`/account/orders/${orderId}`} className="hover:text-emerald-700">Chi tiết đơn</Link>
        <span>/</span>
        <span className="font-semibold text-emerald-800">Trả hàng / Đổi size</span>
      </nav>

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
        </div>
      ) : errorMessage && !order ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      ) : order ? (
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-[22px] border border-neutral-100 bg-white shadow-[0_18px_50px_rgba(15,76,58,0.08)]">
          <div className="border-b border-neutral-100 px-6 py-6 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Yêu cầu trả hàng / đổi size</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
              Đơn hàng #{order.orderCode || order.id || orderId}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Chọn sản phẩm trong đơn. Nếu trả hàng, số tiền hoàn sẽ tự lấy đúng theo giá sản phẩm đã mua.
            </p>
          </div>

          {errorMessage && (
            <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 sm:mx-8">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <PackageCheck className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-black text-neutral-950">Sản phẩm cần xử lý</h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['RETURN', 'Trả hàng hoàn tiền', 'Hoàn tiền đúng theo sản phẩm đã mua'],
                    ['EXCHANGE_SIZE', 'Đổi size', 'Không cần nhập tài khoản ngân hàng'],
                  ].map(([value, label, description]) => (
                    <label key={value} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${form.type === value ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : 'border-neutral-200 text-neutral-600 hover:border-emerald-200'}`}>
                      <input
                        type="radio"
                        name="refundType"
                        value={value}
                        checked={form.type === value}
                        onChange={() => setForm((current) => ({ ...current, type: value, requestedSizeId: '' }))}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 accent-emerald-700"
                      />
                      <span>
                        <span className="block text-sm font-black">{label}</span>
                        <span className="mt-1 block text-xs font-semibold text-neutral-500">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <label className="mt-5 grid min-w-0 gap-2">
                  <span className="text-sm font-black text-neutral-950">Chọn sản phẩm trong đơn</span>
                  <div className="relative min-w-0">
                    <select
                      value={form.productKey}
                      onChange={(event) => {
                        const productKey = event.target.value
                        const item = items.find((entry, index) => getItemKey(entry, index) === productKey)
                        setForm((current) => ({ ...current, productKey, currentSizeId: getItemSizeId(item), requestedSizeId: '' }))
                      }}
                      disabled={isSubmitting}
                      className="h-12 w-full min-w-0 appearance-none rounded-xl border border-neutral-200 bg-white px-4 pr-10 text-sm font-semibold text-transparent outline-none focus:border-emerald-500"
                    >
                      <option value="">Chọn sản phẩm cần trả / đổi</option>
                      {items.map((item, index) => (
                        <option key={getItemKey(item, index)} value={getItemKey(item, index)}>
                          {getItemLabel(item)}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 left-4 right-10 flex items-center truncate text-sm font-semibold text-neutral-800">
                      {selectedItem ? getItemLabel(selectedItem) : 'Chọn sản phẩm cần trả / đổi'}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-500">⌄</span>
                  </div>
                </label>

                {selectedItem && (
                  <div className="mt-4 flex min-w-0 gap-4 rounded-2xl bg-neutral-50 p-4">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                      {getItemImage(selectedItem) ? (
                        <img src={getItemImage(selectedItem)} alt={selectedItem.productName || 'Sản phẩm'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-neutral-300">IMG</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-black text-neutral-950">{selectedItem.productName || selectedItem.productId || 'Sản phẩm'}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-neutral-500">Màu: {getItemColorName(selectedItem)} · Size: {getItemSizeName(selectedItem)} · SL: {selectedItem.quantity || 1}</p>
                      <p className="mt-2 text-lg font-black text-emerald-700">{formatCurrency(selectedAmount)}</p>
                      {selectedOriginalAmount !== selectedAmount && (
                        <p className="mt-1 text-xs font-semibold text-neutral-500">Giá sản phẩm trước giảm giá: {formatCurrency(selectedOriginalAmount)}</p>
                      )}
                    </div>
                  </div>
                )}

                {isExchangeSize && (
                  <div className="mt-5 grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-neutral-950">Size hiện tại</span>
                      <select
                        value={form.currentSizeId}
                        onChange={(event) => setForm((current) => ({ ...current, currentSizeId: event.target.value }))}
                        disabled={isSubmitting || !form.productKey}
                        className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="">Chọn size</option>
                        {getItemSizeOptions(selectedItem).map((size) => (
                          <option key={size.id} value={size.id}>{size.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-neutral-950">Size muốn đổi</span>
                      <select
                        value={form.requestedSizeId}
                        onChange={(event) => setForm((current) => ({ ...current, requestedSizeId: event.target.value }))}
                        disabled={isSubmitting || !form.productKey}
                        className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="">Chọn size khác cùng sản phẩm</option>
                        {getItemSizeOptions(selectedItem)
                          .filter((size) => String(size.id) !== String(form.currentSizeId))
                          .map((size) => (
                            <option key={size.id} value={size.id}>{size.name}{Number(size.stock) <= 0 ? ' - có thể hết hàng' : ''}</option>
                          ))}
                      </select>
                    </label>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-black text-neutral-950">Lý do và bằng chứng</h2>
                </div>
                <label className="mt-5 grid gap-2">
                  <span className="text-sm font-black text-neutral-950">Lý do trả hàng / đổi size</span>
                  <textarea
                    value={form.reason}
                    onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    rows={5}
                    disabled={isSubmitting}
                    placeholder="Ví dụ: sản phẩm bị lỗi đường may, giao sai size, không đúng màu..."
                    className="resize-none rounded-xl border border-neutral-200 bg-emerald-50/40 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-500"
                  />
                </label>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-neutral-950">Ảnh bằng chứng</span>
                    <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-center text-sm font-bold text-neutral-500 hover:border-emerald-300 hover:bg-emerald-50">
                      <ImagePlus className="mb-2 h-5 w-5 text-emerald-700" />
                      {isUploadingImages ? 'Đang tải ảnh...' : 'Chọn ảnh sản phẩm lỗi'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={isSubmitting || isUploadingImages}
                        className="sr-only"
                      />
                    </span>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-neutral-950">Image URL</span>
                    <textarea
                      value={form.imageUrlsText}
                      onChange={(event) => setForm((current) => ({ ...current, imageUrlsText: event.target.value }))}
                      rows={4}
                      disabled={isSubmitting}
                      placeholder="Mỗi dòng một URL ảnh"
                      className="resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
                {refundImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {refundImages.map((image) => (
                      <div key={image.url} className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                        <img src={image.url} alt={image.name || 'Ảnh bằng chứng'} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setRefundImages((current) => current.filter((entry) => entry.url !== image.url))}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm"
                          aria-label="Xóa ảnh"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              {!isExchangeSize && (
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
                      <Banknote className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-black text-neutral-950">Thông tin nhận tiền</h2>
                  </div>
                  <div className="mt-5 grid gap-4">
                    <div>
                      <p className="text-sm font-black text-neutral-950">Số tiền hoàn</p>
                      <p className="mt-2 rounded-xl bg-white px-4 py-3 text-2xl font-black text-emerald-700">
                        {selectedItem ? formatCurrency(selectedAmount) : 'Chọn sản phẩm'}
                      </p>
                      {selectedItem && selectedOriginalAmount !== selectedAmount && (
                        <p className="mt-2 text-xs font-semibold leading-5 text-emerald-700/70">
                          Đã tự điều chỉnh theo tổng tiền đơn sau giảm giá để backend chấp nhận.
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-neutral-950">Ngân hàng</span>
                        <input
                          value={form.bankName}
                          onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                          disabled={isSubmitting}
                          placeholder="TPBank"
                          className="h-12 rounded-xl border border-emerald-100 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-neutral-950">Mã NH</span>
                        <input
                          value={form.bankCode}
                          onChange={(event) => setForm((current) => ({ ...current, bankCode: event.target.value.toUpperCase() }))}
                          disabled={isSubmitting}
                          placeholder="TPB"
                          className="h-12 rounded-xl border border-emerald-100 bg-white px-4 text-sm uppercase outline-none focus:border-emerald-500"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-neutral-950">Số tài khoản</span>
                      <input
                        value={form.accountNumber}
                        onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))}
                        disabled={isSubmitting}
                        placeholder="07692868901"
                        className="h-12 rounded-xl border border-emerald-100 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-neutral-950">Tên chủ tài khoản</span>
                      <input
                        value={form.accountName}
                        onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value.toUpperCase() }))}
                        disabled={isSubmitting}
                        placeholder="NGUYEN VAN A"
                        className="h-12 rounded-xl border border-emerald-100 bg-white px-4 text-sm uppercase outline-none focus:border-emerald-500"
                      />
                    </label>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                    <RefreshCw className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-black text-neutral-950">Tóm tắt yêu cầu</h2>
                </div>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-neutral-500">Loại yêu cầu</span>
                    <span className="text-right font-black text-neutral-950">{getRefundTypeLabel(form.type)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-neutral-500">Sản phẩm</span>
                    <span className="max-w-48 text-right font-black text-neutral-950">{selectedItem?.productName || '-'}</span>
                  </div>
                  {!isExchangeSize && (
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-neutral-500">Số tiền</span>
                      <span className="text-right text-lg font-black text-emerald-700">{selectedItem ? formatCurrency(selectedAmount) : '-'}</span>
                    </div>
                  )}
                  <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs font-semibold leading-5 text-neutral-500">
                    PoloMan sẽ kiểm tra bằng chứng và phản hồi trạng thái tại trang “Yêu cầu trả/đổi hàng của tôi”.
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Link to={`/account/orders/${orderId}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-black text-neutral-700 hover:bg-neutral-50">
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center">
          <p className="text-base font-semibold text-emerald-800">Không tìm thấy đơn hàng.</p>
          <Link to="/account/orders" className="mt-4 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900">
            Về lịch sử đơn hàng
          </Link>
        </div>
      )}
    </div>
  )
}

export default AccountRefundRequest
