import { getApiData, http, publicHttp } from '../../../shared/api'

function normalizeReviewList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.reviews)) return data.reviews
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.content)) return data.content

  return []
}

function normalizeRatingCounts(ratingCounts = {}) {
  return [0, 1, 2, 3, 4, 5].reduce((counts, rating) => {
    counts[String(rating)] = Number(ratingCounts?.[rating] ?? ratingCounts?.[String(rating)] ?? 0)
    return counts
  }, {})
}

export function normalizeReviewSummary(data, productId = '') {
  return {
    productId: data?.productId || productId,
    totalReviews: Number(data?.totalReviews || 0),
    averageRating: Number(data?.averageRating || 0),
    ratingCounts: normalizeRatingCounts(data?.ratingCounts),
  }
}

export const emptyReviewSummary = normalizeReviewSummary()

export const reviewApi = {
  async createReview(payload) {
    const response = await http.post('/reviews', payload)
    return getApiData(response)
  },

  async getAllReviews() {
    const response = await publicHttp.get('/reviews')
    return normalizeReviewList(getApiData(response))
  },

  async getReviewById(id) {
    const response = await publicHttp.get(`/reviews/${id}`)
    return getApiData(response)
  },

  async getReviewsByProductId(productId) {
    const response = await publicHttp.get(`/reviews/product/${productId}`)
    return normalizeReviewList(getApiData(response))
  },

  async getReviewSummaryByProductId(productId) {
    const response = await publicHttp.get(`/reviews/product/${productId}/summary`)
    return normalizeReviewSummary(getApiData(response), productId)
  },

  async updateReview(id, payload) {
    const response = await http.put(`/reviews/${id}`, payload)
    return getApiData(response)
  },

  async deleteReview(id) {
    const response = await http.delete(`/reviews/${id}`)
    return getApiData(response)
  },
}
