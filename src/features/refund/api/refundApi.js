import { getApiData, http } from '../../../shared/api'

function unwrapApiResponse(response) {
  const data = getApiData(response)
  return data?.data ?? data
}

function normalizeRefundPayload(payload) {
  const normalizedPayload = {
    orderId: payload?.orderId || '',
    type: payload?.type || 'RETURN',
    reason: payload?.reason || '',
    imageUrls: Array.isArray(payload?.imageUrls) ? payload.imageUrls.filter(Boolean) : [],
    bankCode: payload?.bankCode || '',
    bankName: payload?.bankName || '',
    accountNumber: payload?.accountNumber || '',
    accountName: payload?.accountName || '',
  }

  if (payload?.productId) normalizedPayload.productId = payload.productId
  if (payload?.currentSizeId) normalizedPayload.currentSizeId = payload.currentSizeId
  if (payload?.requestedSizeId) normalizedPayload.requestedSizeId = payload.requestedSizeId

  if (payload?.refundAmount !== undefined && payload?.refundAmount !== null && payload?.refundAmount !== '') {
    normalizedPayload.refundAmount = Number(payload.refundAmount)
  }

  return normalizedPayload
}

export const refundApi = {
  async requestRefund(payload) {
    const response = await http.post('/refund-request', normalizeRefundPayload(payload))
    return unwrapApiResponse(response)
  },

  async getMyRefunds() {
    const response = await http.get('/my-refunds')
    const data = unwrapApiResponse(response)
    return Array.isArray(data) ? data : []
  },

  async getAllRefunds() {
    const response = await http.get('/refunds')
    const data = unwrapApiResponse(response)
    return Array.isArray(data) ? data : []
  },

  async getAdminRefundsCursor({ limit = 20, cursor } = {}) {
    const response = await http.get('/refunds/admin/cursor', {
      params: {
        limit,
        ...(cursor ? { cursor } : {}),
      },
    })
    const data = unwrapApiResponse(response)

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      nextCursor: data?.nextCursor || null,
      hasNext: Boolean(data?.hasNext),
      limit: Number(data?.limit || limit),
    }
  },

  async getAdminRefundById(id) {
    const response = await http.get(`/refunds/${id}`)
    return unwrapApiResponse(response)
  },

  async approveRefund(id, payload) {
    const response = await http.post(`/refunds/${id}/approve`, {
      note: payload?.note || '',
    })
    return unwrapApiResponse(response)
  },

  async rejectRefund(id, payload) {
    const response = await http.post(`/refunds/${id}/reject`, {
      reason: payload?.reason || '',
      note: payload?.note || '',
    })
    return unwrapApiResponse(response)
  },

  async markRefunded(id, payload) {
    const response = await http.post(`/refunds/${id}/mark-refunded`, {
      note: payload?.note || '',
    })
    return unwrapApiResponse(response)
  },

  async markReceived(id, payload) {
    const response = await http.post(`/refunds/${id}/mark-received`, {
      note: payload?.note || '',
    })
    return unwrapApiResponse(response)
  },
}
