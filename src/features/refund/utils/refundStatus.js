export function normalizeRefundStatus(status) {
  return String(status || 'PENDING').toUpperCase()
}

export function getRefundTypeLabel(type) {
  const normalizedType = String(type || 'RETURN').toUpperCase()
  const labels = {
    RETURN: 'Trả hàng hoàn tiền',
    EXCHANGE_SIZE: 'Đổi size',
  }

  return labels[normalizedType] || type || 'Trả hàng hoàn tiền'
}

export function getRefundStatusLabel(status) {
  const normalizedStatus = normalizeRefundStatus(status)
  const labels = {
    PENDING: 'Chờ xử lý',
    APPROVED: 'Đã duyệt',
    EXCHANGE_APPROVED: 'Đã duyệt đổi size',
    RETURN_RECEIVED: 'Đã nhận hàng',
    REFUND_REQUIRED: 'Đang xử lý',
    PROCESSING: 'Đang xử lý',
    SUCCESS: 'Hoàn tất',
    EXCHANGED: 'Đã đổi size',
    REJECTED: 'Từ chối',
    FAILED: 'Thất bại',
  }

  return labels[normalizedStatus] || status || 'Chờ xử lý'
}

export function getRefundStatusDescription(status) {
  const normalizedStatus = normalizeRefundStatus(status)
  const labels = {
    PENDING: 'Đang chờ xem xét',
    APPROVED: 'Chờ khách gửi hàng',
    EXCHANGE_APPROVED: 'Chờ khách gửi hàng',
    RETURN_RECEIVED: 'Shop đã kiểm tra hàng',
    REFUND_REQUIRED: 'Đang hoàn tiền',
    PROCESSING: 'Đang hoàn tiền',
    SUCCESS: 'Đã hoàn tiền',
    EXCHANGED: 'Đổi size thành công',
    REJECTED: 'Đã từ chối',
    FAILED: 'Xử lý thất bại',
  }

  return labels[normalizedStatus] || ''
}

export function getRefundStatusBadgeClass(status) {
  const normalizedStatus = normalizeRefundStatus(status)

  if (normalizedStatus === 'PENDING') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (['APPROVED', 'EXCHANGE_APPROVED'].includes(normalizedStatus)) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (['RETURN_RECEIVED', 'REFUND_REQUIRED', 'PROCESSING'].includes(normalizedStatus)) return 'border-violet-200 bg-violet-50 text-violet-700'
  if (['SUCCESS', 'EXCHANGED'].includes(normalizedStatus)) return 'border-slate-200 bg-slate-50 text-slate-700'
  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'FAILED') return 'border-red-200 bg-red-50 text-red-700'

  return 'border-neutral-200 bg-neutral-50 text-neutral-600'
}
