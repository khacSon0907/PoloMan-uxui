export function normalizeOrderStatus(status) {
  return String(status || 'PENDING').toUpperCase()
}

export function isPendingOrder(status) {
  return normalizeOrderStatus(status) === 'PENDING'
}

export function getOrderStatusLabel(status) {
  const labels = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang xử lý',
    SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
    CANCELED: 'Đã hủy',
    RETURNED: 'Đã trả hàng',
  }

  return labels[normalizeOrderStatus(status)] || status || labels.PENDING
}

export function getOrderStatusBadgeClass(status) {
  const normalizedStatus = normalizeOrderStatus(status)

  if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'CANCELED') {
    return 'border-red-200 bg-red-50 text-red-600'
  }

  if (normalizedStatus === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (normalizedStatus === 'DELIVERED') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (normalizedStatus === 'RETURNED') {
    return 'border-neutral-200 bg-neutral-50 text-neutral-600'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
