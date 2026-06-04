export function formatCurrency(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number.isFinite(number) ? number : 0)
}

export function getProductId(product) {
  return product?.id || product?._id || product?.slug || product?.name
}

export function getProductName(product) {
  return product?.name || product?.productName || product?.title || ''
}

export function getProductSlug(product) {
  return product?.slug || getProductId(product)
}

export function getProductCategoryId(product) {
  return (
    product?.category?.slug ||
    product?.category?.id ||
    product?.category?._id ||
    product?.categoryName ||
    product?.categoryId ||
    ''
  )
}

export function getProductColors(product) {
  return product?.colors || product?.colorVariants || []
}

export function getProductColorId(color) {
  return color?.id || color?._id || color?.colorId || ''
}

export function getProductColorName(color) {
  return color?.colorName || color?.name || color?.title || ''
}

export function getProductColorCode(color) {
  return color?.colorCode || color?.code || color?.hex || ''
}

export function getProductImages(product, color = getProductColors(product)[0]) {
  return color?.images || product?.images || []
}

export function getImageUrl(image) {
  if (typeof image === 'string') return image

  return image?.url || image?.secureUrl || image?.imageUrl || image?.src || ''
}

export function getProductImage(product, color) {
  const images = getProductImages(product, color)
  const mainImage = images.find((image) => image?.main) || images[0]

  return getImageUrl(mainImage) || product?.imageUrl || product?.image || ''
}

export function getProductSizes(product, color = getProductColors(product)[0]) {
  return color?.sizes || color?.sizeVariants || product?.sizes || []
}

export function getProductSizeId(size) {
  return size?.id || size?._id || size?.sizeId || size?.sku || getProductSizeName(size)
}

export function getProductSizeName(size) {
  return size?.size || size?.sizeName || size?.name || size?.title || ''
}

export function getProductStock(product) {
  const colors = getProductColors(product)

  if (!colors.length) {
    return getProductSizes(product).reduce((sum, size) => sum + Number(size?.quantity || 0), 0)
  }

  return colors.reduce(
    (sum, color) =>
      sum + getProductSizes(product, color).reduce((sizeSum, size) => sizeSum + Number(size?.quantity || 0), 0),
    0,
  )
}

export function getProductPrice(product) {
  return Number(product?.salePrice || product?.price || 0)
}

export function getProductComparePrice(product) {
  return product?.salePrice ? Number(product?.price || 0) : 0
}
