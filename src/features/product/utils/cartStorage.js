const CART_KEY = 'poloman_guest_cart'
const LEGACY_CART_KEY = 'poloman_cart'
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const CART_UPDATED_EVENT = 'poloman-cart-updated'

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readCookie(name) {
  if (!canUseBrowserStorage()) return ''

  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`))

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : ''
}

function writeCookie(name, value) {
  if (!canUseBrowserStorage()) return

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${CART_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}

function deleteCookie(name) {
  if (!canUseBrowserStorage()) return

  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
}

function readLegacyCart() {
  try {
    const value = window.localStorage.getItem(LEGACY_CART_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function migrateLegacyCartToCookie() {
  if (!canUseBrowserStorage() || readCookie(CART_KEY)) return

  const legacyItems = readLegacyCart()

  if (legacyItems.length) {
    writeCookie(CART_KEY, JSON.stringify(legacyItems))
  }
}

function readRawCart() {
  migrateLegacyCartToCookie()

  try {
    const value = readCookie(CART_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCart(items) {
  writeCookie(CART_KEY, JSON.stringify(items))

  if (canUseBrowserStorage()) {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

export const cartStorage = {
  getItems() {
    return readRawCart()
  },

  getCount() {
    return readRawCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  },

  addItem(item) {
    const items = readRawCart()
    const key = [item.productId, item.colorName, item.size].join('|')
    const existingIndex = items.findIndex(
      (cartItem) => [cartItem.productId, cartItem.colorName, cartItem.size].join('|') === key,
    )

    if (existingIndex >= 0) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: Number(items[existingIndex].quantity || 0) + Number(item.quantity || 1),
      }
    } else {
      items.push({ ...item, quantity: Number(item.quantity || 1) })
    }

    writeCart(items)
  },

  updateQuantity(index, quantity) {
    const items = readRawCart()
    const nextQuantity = Math.max(1, Number(quantity || 1))

    if (!items[index]) return

    items[index] = { ...items[index], quantity: nextQuantity }
    writeCart(items)
  },

  removeItem(index) {
    const items = readRawCart().filter((_, itemIndex) => itemIndex !== index)
    writeCart(items)
  },

  clear() {
    deleteCookie(CART_KEY)

    if (canUseBrowserStorage()) {
      window.dispatchEvent(new Event(CART_UPDATED_EVENT))
    }
  },
}
