import { getApiData, http, publicHttp } from '../../../shared/api'

function normalizeProductList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.content)) return data.content

  return []
}

export const productApi = {
  async list() {
    const response = await publicHttp.get('/products')
    return normalizeProductList(getApiData(response))
  },

  async getAll() {
    return productApi.list()
  },

  async getById(id) {
    const response = await publicHttp.get(`/products/${id}`)
    return getApiData(response)
  },

  async getByCategoryId(categoryId) {
    const response = await publicHttp.get(`/products/category/${categoryId}`)
    return normalizeProductList(getApiData(response))
  },

  async create(payload) {
    const response = await http.post('/products', payload)
    return getApiData(response)
  },

  async update(id, payload) {
    const response = await http.put(`/products/${id}`, payload)
    return getApiData(response)
  },

  async delete(id) {
    const response = await http.delete(`/products/${id}`)
    return getApiData(response)
  },
}
