let accessToken = null
let currentUser = null
let isInitializing = false
const listeners = new Set()
const LEGACY_AUTH_STORAGE_KEYS = [
  'poloman.auth.accessToken',
  'poloman.auth.refreshToken',
  'poloman.auth.user',
]
const CLIENT_CLEARABLE_AUTH_COOKIE_NAMES = [
  'refreshToken',
  'refreshtoken',
  'JSESSIONID',
]

function clearLegacyAuthStorage() {
  if (typeof window === 'undefined') return

  try {
    LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
      window.localStorage?.removeItem(key)
      window.sessionStorage?.removeItem(key)
    })
  } catch {
    // Storage can be blocked in private or restricted browser modes.
  }
}

clearLegacyAuthStorage()

function clearClientAuthCookies() {
  if (typeof document === 'undefined') return

  CLIENT_CLEARABLE_AUTH_COOKIE_NAMES.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; path=/`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

export function normalizeRoles(roles) {
  if (!roles) return []

  if (roles instanceof Set) {
    return Array.from(roles).map(String).filter(Boolean)
  }

  if (Array.isArray(roles)) {
    return roles.map(String).filter(Boolean)
  }

  if (typeof roles === 'string') {
    return roles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean)
  }

  if (typeof roles === 'object') {
    return Object.values(roles).map(String).filter(Boolean)
  }

  return []
}

export function hasRole(user, role) {
  const expectedRole = String(role).toUpperCase()
  return normalizeRoles(user?.roles || user?.role).some(
    (userRole) => userRole.toUpperCase() === expectedRole,
  )
}

export function canChangePassword(user) {
  const authProvider = String(
    user?.authProvider || user?.providerType || user?.provider || '',
  )
    .trim()
    .toUpperCase()

  return authProvider === 'LOCAL' || authProvider === 'LOCAL_GOOGLE'
}

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
      authProvider:
        decodedPayload.authProvider ||
        decodedPayload.providerType ||
        decodedPayload.provider ||
        '',
      roles: normalizeRoles(
        decodedPayload.roles || decodedPayload.role || decodedPayload.authorities,
      ),
    }
  } catch {
    return null
  }
}

function normalizeUser(user, token) {
  const decodedUser = decodeJwtPayload(token)
  const mergedUser = user
    ? {
        ...decodedUser,
        ...user,
        roles: normalizeRoles(user.roles || user.role || decodedUser?.roles),
      }
    : null

  if (mergedUser) return mergedUser

  if (!currentUser) return decodedUser
  if (!decodedUser) return currentUser

  const isSameUser =
    !decodedUser.id ||
    !currentUser.id ||
    decodedUser.id === currentUser.id ||
    decodedUser.email === currentUser.email

  if (!isSameUser) return decodedUser

  return {
    ...decodedUser,
    ...currentUser,
    roles: normalizeRoles(decodedUser.roles || currentUser.roles || currentUser.role),
  }
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
      isInitializing,
      user: currentUser,
    }
  },

  setAccessToken(token, user) {
    accessToken = token || null
    currentUser = accessToken ? normalizeUser(user, accessToken) : null
    isInitializing = false
    notifyListeners()
  },

  setUser(user) {
    currentUser = user ? normalizeUser(user, accessToken) : null
    notifyListeners()
  },

  clearAccessToken() {
    clearLegacyAuthStorage()
    clearClientAuthCookies()
    accessToken = null
    currentUser = null
    isInitializing = false
    notifyListeners()
  },

  setInitializing(value) {
    isInitializing = Boolean(value)
    notifyListeners()
  },

  subscribe(listener) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },
}
