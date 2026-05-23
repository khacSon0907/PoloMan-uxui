let accessToken = null

export const tokenStorage = {
  getAccessToken() {
    return accessToken
  },

  setAccessToken(token) {
    accessToken = token || null
  },

  clearAccessToken() {
    accessToken = null
  },
}
