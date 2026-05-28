import { getApiData, http, publicHttp } from '../../../shared/api'

export const categoryApi = {
  async list() {
    const response = await publicHttp.get('/categories')
    return getApiData(response) || []
  },

  async create(payload) {
    const response = await http.post('/categories', payload)
    return getApiData(response)
  },

  async update(id, payload) {
    const response = await http.put(`/categories/${id}`, { ...payload, id })
    return getApiData(response)
  },

  async delete(id) {
    await http.delete(`/categories/${id}`)
  },

  async getBySlug(slug) {
    const response = await publicHttp.get(`/categories/${slug}`)
    return getApiData(response)
  },
}
