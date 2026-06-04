const FAVORITES_KEY = 'poloman_favorites'
export const FAVORITES_UPDATED_EVENT = 'poloman-favorites-updated'

function canUseStorage() {
  return typeof window !== 'undefined'
}

function getFavoriteId(item) {
  return item?.productId || item?.id || item?._id || item?.slug || ''
}

function notifyFavoritesUpdated() {
  if (canUseStorage()) {
    window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT))
  }
}

function readFavorites() {
  if (!canUseStorage()) return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFavorites(items) {
  if (!canUseStorage()) return

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
  notifyFavoritesUpdated()
}

export const favoriteStorage = {
  getItems() {
    return readFavorites()
  },

  getCount() {
    return readFavorites().length
  },

  hasItem(productId) {
    return readFavorites().some((item) => String(getFavoriteId(item)) === String(productId))
  },

  addItem(item) {
    const itemId = getFavoriteId(item)
    if (!itemId) return

    const favorites = readFavorites()
    if (favorites.some((favorite) => String(getFavoriteId(favorite)) === String(itemId))) return

    writeFavorites([{ ...item, productId: itemId }, ...favorites])
  },

  removeItem(productId) {
    writeFavorites(readFavorites().filter((item) => String(getFavoriteId(item)) !== String(productId)))
  },

  toggleItem(item) {
    const itemId = getFavoriteId(item)
    if (!itemId) return false

    if (this.hasItem(itemId)) {
      this.removeItem(itemId)
      return false
    }

    this.addItem(item)
    return true
  },

  clear() {
    writeFavorites([])
  },
}
