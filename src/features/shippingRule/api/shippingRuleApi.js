import { getApiData, http, publicHttp } from '../../../shared/api'

function unwrapApiResponse(response) {
  const data = getApiData(response)
  return data?.data ?? data
}

function normalizeRuleList(response) {
  const data = unwrapApiResponse(response)

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.shippingRules)) return data.shippingRules

  return []
}

function normalizeRule(rule) {
  if (!rule) return null

  return {
    ...rule,
    defaultShippingFee: Number(rule.defaultShippingFee || 0),
    freeShippingThreshold: Number(rule.freeShippingThreshold || 0),
    freeShippingDates: Array.isArray(rule.freeShippingDates) ? rule.freeShippingDates : [],
    active: rule.active === true,
  }
}

function normalizePayload(payload) {
  return {
    name: payload?.name?.trim() || '',
    defaultShippingFee: Number(payload?.defaultShippingFee || 0),
    freeShippingThreshold: Number(payload?.freeShippingThreshold || 0),
    freeShippingDates: Array.isArray(payload?.freeShippingDates) ? payload.freeShippingDates.filter(Boolean) : [],
    active: payload?.active === true,
  }
}

export function getShippingRuleId(rule) {
  return rule?.id || rule?._id || rule?.name || ''
}

export function calculateShippingFee(rule, subtotal, now = new Date()) {
  const normalizedRule = normalizeRule(rule)
  const currentSubtotal = Number(subtotal || 0)

  if (!normalizedRule || currentSubtotal <= 0) return 0

  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  if (normalizedRule.freeShippingDates.includes(today)) return 0
  if (normalizedRule.freeShippingThreshold > 0 && currentSubtotal >= normalizedRule.freeShippingThreshold) return 0

  return normalizedRule.defaultShippingFee
}

export function getFreeShippingProgress(rule, subtotal) {
  const normalizedRule = normalizeRule(rule)
  const threshold = Number(normalizedRule?.freeShippingThreshold || 0)
  const currentSubtotal = Number(subtotal || 0)

  if (!normalizedRule || threshold <= 0 || currentSubtotal <= 0 || currentSubtotal >= threshold) return 0

  return threshold - currentSubtotal
}

export const shippingRuleApi = {
  async getActive() {
    const response = await publicHttp.get('/shipping-rules/active')
    return normalizeRule(unwrapApiResponse(response))
  },

  async list() {
    const response = await http.get('/shipping-rules')
    return normalizeRuleList(response).map(normalizeRule).filter(Boolean)
  },

  async create(payload) {
    const response = await http.post('/shipping-rules', normalizePayload(payload))
    return normalizeRule(unwrapApiResponse(response))
  },

  async update(id, payload) {
    const response = await http.put(`/shipping-rules/${id}`, normalizePayload(payload))
    return normalizeRule(unwrapApiResponse(response))
  },

  async delete(id) {
    await http.delete(`/shipping-rules/${id}`)
    return true
  },
}
