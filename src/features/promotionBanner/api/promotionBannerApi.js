import { getApiData, http, publicHttp } from '../../../shared/api'

function normalizePromotionBannerList(response) {
  const data = getApiData(response)

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.promotionBanners)) return data.promotionBanners
  if (Array.isArray(data?.data)) return data.data

  return []
}

export const promotionBannerApi = {
  async list(params = {}) {
    const response = await publicHttp.get('/promotion-banners', { params })
    return normalizePromotionBannerList(response)
  },

  async listActive() {
    const response = await publicHttp.get('/promotion-banners/active')
    return normalizePromotionBannerList(response)
  },

  async create(payload) {
    const response = await http.post('/promotion-banners', payload)
    return getApiData(response)
  },

  async update(id, payload) {
    const response = await http.put(`/promotion-banners/${id}`, { ...payload, id })
    return getApiData(response)
  },

  async delete(id) {
    await http.delete(`/promotion-banners/${id}`)
    return true
  },
}
