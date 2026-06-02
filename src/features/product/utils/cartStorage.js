const CART_KEY = 'poloman_cart'
export const CART_UPDATED_EVENT = 'poloman-cart-updated'

function readRawCart() {
  try {
    const value = window.localStorage.getItem(CART_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCart(items) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
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
    writeCart([])
  },
}
