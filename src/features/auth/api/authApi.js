import { getApiData, http, publicHttp, tokenStorage } from '../../../shared/api'
import { userApi } from '../../user'

function getAccessToken(loginData) {
  const data = loginData?.data ?? loginData

  return (
    data?.accessToken ||
    data?.token ||
    data?.access_token ||
    data?.jwt ||
    data?.jwtToken ||
    data?.access ||
    data?.authToken ||
    data?.bearerToken
  )
}

function getUser(loginData) {
  const data = loginData?.data ?? loginData

  return data?.user || data?.account || data?.profile || data
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function persistLoginTokens(response) {
  const loginData = getApiData(response)
  const accessToken = getAccessToken(loginData)

  if (!accessToken) {
    throw new Error('Login response did not include an access token')
  }

  tokenStorage.setAccessToken(
    accessToken,
    getUser(loginData),
  )
  return response
}

async function syncCurrentUser() {
  const user = await userApi.getMe()
  tokenStorage.setUser(user)
  return user
}

async function clearExistingSession() {
  const existingAccessToken = tokenStorage.getAccessToken()

  await publicHttp
    .post(
      '/auth/logout',
      undefined,
      existingAccessToken
        ? {
            headers: {
              Authorization: `Bearer ${existingAccessToken}`,
            },
          }
        : undefined,
    )
    .catch(() => undefined)

  tokenStorage.clearAccessToken()
}

export const authApi = {
  async login(payload) {
    await clearExistingSession()
    const response = await publicHttp.post('/auth/login', payload)
    persistLoginTokens(response)
    const user = await syncCurrentUser()

    if (payload?.email && normalizeEmail(user?.email) !== normalizeEmail(payload.email)) {
      await clearExistingSession()
      throw new Error('Phiên đăng nhập cũ chưa được xóa đúng cách. Vui lòng xóa cookie refreshToken/refreshtoken rồi đăng nhập lại.')
    }

    return response
  },

  async getMe() {
    return syncCurrentUser()
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

  exchangeOAuth2Code(code) {
    return publicHttp.post('/auth/oauth2/exchange', { code }, { withCredentials: true })
  },

  changePassword(payload) {
    return http.post('/auth/change-password', payload)
  },

  async refreshToken() {
    const response = await publicHttp.post('/auth/refresh')
    return persistLoginTokens(response)
  },

  async logout() {
    const existingAccessToken = tokenStorage.getAccessToken()

    try {
      return await publicHttp.post(
        '/auth/logout',
        undefined,
        existingAccessToken
          ? {
              headers: {
                Authorization: `Bearer ${existingAccessToken}`,
              },
            }
          : undefined,
      )
    } finally {
      tokenStorage.clearAccessToken()
    }
  },
}
