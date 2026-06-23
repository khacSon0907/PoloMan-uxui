import http from './axiosClient'

export const revenueApi = {
  getDailyRevenue: (date) => http.get(`/revenue/daily`, { params: { date } }),
  getWeeklyRevenue: (date) => http.get(`/revenue/weekly`, { params: { date } }),
  getMonthlyRevenue: (date) => http.get(`/revenue/monthly`, { params: { date } }),
  getTotalRevenue: () => http.get(`/revenue/total`),
  getTopSellingProducts: (limit) => http.get(`/revenue/top-products`, { params: { limit } }),
}
