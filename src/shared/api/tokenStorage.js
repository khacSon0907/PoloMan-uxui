let accessToken = null
let currentUser = null
const listeners = new Set()

function decodeJwtPayload(token) {
  if (!token) return null

  try {
    const [, payload] = token.split('.')
    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = JSON.parse(atob(normalizedPayload))

    return {
      id: decodedPayload.id || decodedPayload.userId || decodedPayload.sub || '',
      email: decodedPayload.email || decodedPayload.sub || '',
      username: decodedPayload.username || decodedPayload.name || decodedPayload.fullName || '',
      avatarUrl: decodedPayload.avatarUrl || decodedPayload.avatar || decodedPayload.picture || '',
      roles: decodedPayload.roles || decodedPayload.authorities || [],
    }
  } catch {
    return null
  }
}

function normalizeUser(user, token) {
  return user || decodeJwtPayload(token)
}

function notifyListeners() {
  const snapshot = tokenStorage.getSnapshot()

  listeners.forEach((listener) => {
    listener(snapshot)
  })
}

export const tokenStorage = {
  getAccessToken() {
    return accessToken
  },

  getUser() {
    return currentUser
  },

  getSnapshot() {
    return {
      accessToken,
      isAuthenticated: Boolean(accessToken),
      user: currentUser,
    }
  },

  setAccessToken(token, user) {
    accessToken = token || null
    currentUser = accessToken ? normalizeUser(user, accessToken) : null
    notifyListeners()
  },

  clearAccessToken() {
    accessToken = null
    currentUser = null
    notifyListeners()
  },

  subscribe(listener) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },
}
