export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'RETURNED']

export function normalizeOrderStatus(status) {
  const normalizedStatus = String(status || 'PENDING').toUpperCase()

  if (normalizedStatus === 'CANCELED') return 'CANCELLED'

  return ORDER_STATUSES.includes(normalizedStatus) ? normalizedStatus : 'PENDING'
}

export function isPendingOrder(status) {
  return normalizeOrderStatus(status) === 'PENDING'
}

export function isConfirmedOrder(status) {
  return normalizeOrderStatus(status) === 'CONFIRMED'
}

export function canCancelOrder(status) {
  return normalizeOrderStatus(status) === 'PENDING'
}

export function canReturnOrder(status) {
  return normalizeOrderStatus(status) === 'CONFIRMED'
}

export function getOrderStatusLabel(status) {
  const labels = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Đã trả hàng',
  }

  return labels[normalizeOrderStatus(status)] || labels.PENDING
}

export function getOrderStatusBadgeClass(status) {
  const normalizedStatus = normalizeOrderStatus(status)

  if (normalizedStatus === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (normalizedStatus === 'CONFIRMED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (normalizedStatus === 'CANCELLED') {
    return 'border-red-200 bg-red-50 text-red-600'
  }

  if (normalizedStatus === 'RETURNED') {
    return 'border-neutral-200 bg-neutral-50 text-neutral-600'
  }

  return 'border-neutral-200 bg-neutral-50 text-neutral-600'
}

export function getOrderErrorCode(error) {
  const data = error?.response?.data || error?.data || {}

  return (
    data.code ||
    data.errorCode ||
    data.error ||
    data.messageCode ||
    data?.data?.code ||
    data?.data?.errorCode ||
    data.message ||
    ''
  )
}

export function getOrderBusinessMessage(error, fallbackMessage) {
  const code = getOrderErrorCode(error)

  if (code === 'ORDER.INSUFFICIENT_STOCK') {
    return 'Không đủ số lượng tồn kho để xác nhận đơn hàng.'
  }

  if (code === 'ORDER.INVALID_STATUS') {
    return 'Trạng thái đơn hàng không hợp lệ.'
  }

  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  )
}
