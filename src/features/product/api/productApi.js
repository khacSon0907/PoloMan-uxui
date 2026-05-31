import { getApiData, http, publicHttp } from '../../../shared/api'

export const productApi = {
  async list() {
    const response = await publicHttp.get('/products')
    return getApiData(response) || []
  },

  async getById(id) {
    const response = await publicHttp.get(`/products/${id}`)
    return getApiData(response)
  },

  async create(payload) {
    const response = await http.post('/products', payload)
    return getApiData(response)
  },
}
