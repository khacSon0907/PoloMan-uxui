import { getApiData, http, publicHttp, tokenStorage } from '../../../shared/api'

function persistLoginTokens(response) {
  const loginData = getApiData(response)
  tokenStorage.setAccessToken(
    loginData?.accessToken,
    loginData?.user || loginData?.account || loginData?.profile || loginData,
  )
  return response
}

export const authApi = {
  async login(payload) {
    const response = await publicHttp.post('/auth/login', payload)
    return persistLoginTokens(response)
  },

  async getMe() {
    const response = await http.get('/users/me')
    const user = getApiData(response)
    tokenStorage.setUser(user)
    return user
  },

  register(payload) {
    return publicHttp.post('/auth/register', payload)
  },

  verifyOtp(payload) {
    return publicHttp.post('/auth/verify-otp', payload)
  },

  forgotPassword(payload) {
    return publicHttp.post('/auth/forgot-password', payload)
  },

  verifyForgotPasswordOtp(payload) {
    return publicHttp.post('/auth/verify-forgot-password-otp', payload)
  },

  resetPassword(payload) {
    return publicHttp.post('/auth/reset-password', payload)
  },

  changePassword(payload) {
    return http.post('/auth/change-password', payload)
  },

  async refreshToken(refreshToken) {
    const response = await publicHttp.post(
      '/auth/refresh',
      refreshToken ? { refreshToken } : undefined,
    )
    return persistLoginTokens(response)
  },

  async logout() {
    try {
      return await http.post('/auth/logout')
    } finally {
      tokenStorage.clearAccessToken()
    }
  },
}
