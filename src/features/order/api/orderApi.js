import { getApiData, http } from '../../../shared/api'

function unwrapApiResponse(response) {
  const data = getApiData(response)
  return data?.data ?? data
}

function normalizeCreateOrderPayload(payload) {
  const normalizedPayload = {
    receiverName: payload?.receiverName || '',
    receiverPhone: payload?.receiverPhone || '',
    receiverAddress: payload?.receiverAddress || '',
    items: Array.isArray(payload?.items) ? payload.items : [],
    discountAmount: Number(payload?.discountAmount || 0),
    paymentMethod: payload?.paymentMethod || 'COD',
    note: payload?.note || '',
  }

  if (payload?.userId) {
    normalizedPayload.userId = payload.userId
  } else if (payload?.guest) {
    normalizedPayload.guest = {
      email: payload.guest.email || '',
      username: payload.guest.username || '',
    }
  }

  return normalizedPayload
}

export const orderApi = {
  async createOrder(payload) {
    const response = await http.post('/orders', normalizeCreateOrderPayload(payload))
    return unwrapApiResponse(response)
  },

  async getAllOrders() {
    const response = await http.get('/orders')
    const data = unwrapApiResponse(response)
    return Array.isArray(data) ? data : []
  },

  async getAdminOrdersCursor({ limit = 20, cursor = '' } = {}) {
    const response = await http.get('/orders/admin/cursor', {
      params: {
        limit,
        ...(cursor ? { cursor } : {}),
      },
    })
    const data = unwrapApiResponse(response)

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      nextCursor: data?.nextCursor || null,
      hasNext: Boolean(data?.hasNext && data?.nextCursor),
      limit: Number(data?.limit || limit),
    }
  },

  async getOrdersByUserId(userId) {
    const response = await http.get(`/orders/user/${userId}`)
    const data = unwrapApiResponse(response)
    return Array.isArray(data) ? data : []
  },

  async getOrder(orderId) {
    const response = await http.get(`/orders/${orderId}`)
    return unwrapApiResponse(response)
  },

  async confirmOrder(orderId) {
    const response = await http.put(`/orders/${orderId}/confirm`)
    return unwrapApiResponse(response)
  },

  async cancelOrder(orderId, cancelReason = '') {
    const response = await http.put(`/orders/${orderId}/cancel`, { cancelReason })
    return unwrapApiResponse(response)
  },

  async returnOrder(orderId) {
    const response = await http.put(`/orders/${orderId}/return`)
    return unwrapApiResponse(response)
  },
}
