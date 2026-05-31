const ACCESS_TOKEN_STORAGE_KEY = 'poloman.auth.accessToken'
const USER_STORAGE_KEY = 'poloman.auth.user'

function getStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredUser() {
  const storage = getStorage()
  if (!storage) return null

  try {
    const rawUser =
      storage.getItem(USER_STORAGE_KEY) ||
      window.sessionStorage?.getItem(USER_STORAGE_KEY)

    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

function storeUser(user) {
  const storage = getStorage()
  if (!storage) return

  try {
    if (user) {
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      storage.removeItem(USER_STORAGE_KEY)
    }

    window.sessionStorage?.removeItem(USER_STORAGE_KEY)
  } catch {
    // Browser storage can be unavailable in private or restricted browser modes.
  }
}

function readStoredAccessToken() {
  const storage = getStorage()
  if (!storage) return null

  try {
    return storage.getItem(ACCESS_TOKEN_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function storeAccessToken(token) {
  const storage = getStorage()
  if (!storage) return

  try {
    if (token) {
      storage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    } else {
      storage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
  } catch {
    // Browser storage can be unavailable in private or restricted browser modes.
  }
}

let accessToken = readStoredAccessToken()
let currentUser = readStoredUser()
let isInitializing = Boolean(accessToken || currentUser)
const listeners = new Set()

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
  const providerType = String(user?.providerType || user?.provider || '').toUpperCase()
  return !providerType || providerType === 'LOCAL' || providerType === 'LOCAL_GOOGLE'
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
      isAuthenticated: Boolean(accessToken || currentUser),
      isInitializing,
      user: currentUser,
    }
  },

  setAccessToken(token, user) {
    accessToken = token || null
    currentUser = accessToken ? normalizeUser(user, accessToken) : null
    isInitializing = false
    storeAccessToken(accessToken)
    storeUser(currentUser)
    notifyListeners()
  },

  setUser(user) {
    currentUser = user ? normalizeUser(user, accessToken) : null
    storeUser(currentUser)
    notifyListeners()
  },

  clearAccessToken() {
    accessToken = null
    currentUser = null
    isInitializing = false
    storeAccessToken(null)
    storeUser(null)
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
