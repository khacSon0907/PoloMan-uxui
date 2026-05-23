import { getApiData, http, publicHttp, tokenStorage } from '../../../shared/api'

function persistLoginTokens(response) {
  const loginData = getApiData(response)
  tokenStorage.setAccessToken(
    loginData?.accessToken,
    loginData?.user || loginData?.account || loginData?.profile,
  )
  return response
}

export const authApi = {
  async login(payload) {
    const response = await publicHttp.post('/auth/login', payload)
    return persistLoginTokens(response)
  },

  register(payload) {
    return publicHttp.post('/auth/register', payload)
  },

  verifyOtp(payload) {
    return publicHttp.post('/auth/verify-otp', payload)
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
