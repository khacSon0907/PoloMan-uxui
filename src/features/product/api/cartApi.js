import { getApiData, http } from '../../../shared/api'

export const CART_UPDATED_EVENT = 'poloman-cart-updated'
const CART_CACHE_TTL_MS = 500
const cartCacheByUserId = new Map()

export function getUserId(user) {
  return user?.id || user?.userId || user?._id || user?.sub || ''
}

export function notifyCartUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

function normalizeAddItemPayload(payload) {
  return {
    productId: payload?.productId || '',
    productName: payload?.productName || payload?.name || '',
    productImage: payload?.productImage || payload?.image || '',
    colorId: payload?.colorId || '',
    colorName: payload?.colorName || '',
    sizeId: payload?.sizeId || '',
    sizeName: payload?.sizeName || payload?.size || '',
    quantity: Number(payload?.quantity || 1),
  }
}

function getCachedCart(userId) {
  const cached = cartCacheByUserId.get(userId)

  if (!cached) return null
  if (cached.promise) return cached.promise
  if (cached.cart && Date.now() - cached.updatedAt < CART_CACHE_TTL_MS) return cached.cart

  return null
}

function setCachedCart(userId, cart) {
  if (!userId) return

  cartCacheByUserId.set(userId, {
    cart,
    promise: null,
    updatedAt: Date.now(),
  })
}

function setPendingCartRequest(userId, promise) {
  cartCacheByUserId.set(userId, {
    ...(cartCacheByUserId.get(userId) || {}),
    promise,
  })
}

function clearPendingCartRequest(userId, promise) {
  const cached = cartCacheByUserId.get(userId)

  if (cached?.promise === promise) {
    cartCacheByUserId.set(userId, {
      ...cached,
      promise: null,
    })
  }
}

export function normalizeCartItems(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : []

  return items.map((item) => ({
    productId: item.productId || item.product?.id || item.product?._id || '',
    slug: item.product?.slug || item.slug || item.productId || '',
    name: item.productName || item.product?.name || item.name || item.productId || 'San pham',
    price: item.unitPrice || item.price || item.product?.salePrice || item.product?.price || 0,
    image: item.productImage || item.product?.imageUrl || item.product?.image || item.image || '',
    colorId: item.colorId || '',
    colorName: item.colorName || item.color?.name || item.color?.colorName || item.colorId || '',
    colorCode: item.colorCode || item.color?.code || item.color?.colorCode || '',
    sizeId: item.sizeId || '',
    size: item.sizeName || item.size || item.size?.name || item.sizeId || '',
    quantity: Number(item.quantity || 0),
  }))
}

export const cartApi = {
  async getCart(userId) {
    const cachedCart = getCachedCart(userId)

    if (cachedCart) return cachedCart

    const request = http.get(`/carts/${userId}`).then((response) => {
      const cart = getApiData(response)
      setCachedCart(userId, cart)
      return cart
    })

    setPendingCartRequest(userId, request)

    try {
      return await request
    } finally {
      clearPendingCartRequest(userId, request)
    }
  },

  async addItem(userId, payload) {
    const response = await http.post(`/carts/${userId}/items`, normalizeAddItemPayload(payload))
    const cart = getApiData(response)
    setCachedCart(userId, cart)
    notifyCartUpdated()
    return cart
  },

  async updateItem(userId, productId, payload) {
    const response = await http.put(`/carts/${userId}/items/${productId}`, payload)
    const cart = getApiData(response)
    setCachedCart(userId, cart)
    notifyCartUpdated()
    return cart
  },

  async removeItem(userId, productId) {
    const response = await http.delete(`/carts/${userId}/items/${productId}`)
    const cart = getApiData(response)
    setCachedCart(userId, cart)
    notifyCartUpdated()
    return cart
  },

  async clearCart(userId) {
    await http.delete(`/carts/${userId}`)
    cartCacheByUserId.delete(userId)
    notifyCartUpdated()
  },
}
