import { getApiData, http, publicHttp } from '../../../shared/api'

function normalizeBannerList(response) {
  const data = getApiData(response)

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.banners)) return data.banners
  if (Array.isArray(data?.data)) return data.data

  return []
}

export const bannerApi = {
  async list(params = {}) {
    const response = await publicHttp.get('/banners', { params })
    return normalizeBannerList(response)
  },

  async listActive() {
    return this.list({ activeOnly: true })
  },

  async create(payload) {
    const response = await http.post('/banners', payload)
    return getApiData(response)
  },

  async update(id, payload) {
    const response = await http.put(`/banners/${id}`, payload)
    return getApiData(response)
  },

  async delete(id) {
    await http.delete(`/banners/${id}`)
  },
}
