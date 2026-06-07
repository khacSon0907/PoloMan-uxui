import { getApiData, http } from '../../../shared/api'

function unwrapApiResponse(response) {
  const data = getApiData(response)
  return data?.data ?? data
}

function normalizeCreateOrderPayload(payload) {
  return {
    userId: payload?.userId || '',
    receiverName: payload?.receiverName || '',
    receiverPhone: payload?.receiverPhone || '',
    receiverAddress: payload?.receiverAddress || '',
    items: Array.isArray(payload?.items) ? payload.items : [],
    shippingFee: Number(payload?.shippingFee || 0),
    discountAmount: Number(payload?.discountAmount || 0),
    paymentMethod: payload?.paymentMethod || 'COD',
    paymentStatus: payload?.paymentStatus || 'UNPAID',
    status: payload?.status || 'PENDING',
    note: payload?.note || '',
  }
}

export const orderApi = {
  async createOrder(payload) {
    const response = await http.post('/orders', normalizeCreateOrderPayload(payload))
    return unwrapApiResponse(response)
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
}
