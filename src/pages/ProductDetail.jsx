import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  cartApi,
  cartStorage,
  favoriteStorage,
  formatCurrency,
  getImageUrl,
  getProductColorCode,
  getProductColorId,
  getProductColorName,
  getProductColors,
  getProductId,
  getProductImage,
  getProductImages,
  getProductName,
  getProductPrice,
  getProductSizeId,
  getProductSizeName,
  getProductSizes,
  getProductSlug,
  getProductStock,
  getUserId,
  productApi,
} from '../features/product'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'
import { playAddToCartEffect } from '../shared/utils/cartMotion'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageErrorMessage, setPageErrorMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [successMessage, setSuccessMessage] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewImages, setReviewImages] = useState([])
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const mainImageRef = useRef(null)
  const addToCartButtonRef = useRef(null)
  const reviewImageInputRef = useRef(null)
  const reviewImagesRef = useRef([])

  const colors = useMemo(() => getProductColors(product), [product])
  const selectedColor = colors[selectedColorIndex] || colors[0]
  const images = useMemo(() => getProductImages(product, selectedColor), [product, selectedColor])
  const imageUrls = useMemo(() => images.map(getImageUrl).filter(Boolean), [images])
  const sizes = useMemo(() => getProductSizes(product, selectedColor), [product, selectedColor])
  const selectedSizeData = sizes.find((size) => getProductSizeName(size) === selectedSize)
  const selectedStock = Number(selectedSizeData?.quantity || 0)
  const mainImage = imageUrls[selectedImageIndex] || getProductImage(product, selectedColor)
  const productName = getProductName(product)
  const productCategoryId = product?.category?.id || product?.category?._id || product?.categoryId || ''

  usePageMeta({
    title: productName ? `${productName} | PoloMan` : 'Chi tiet san pham | PoloMan',
    description: product?.description || 'Chi tiet san pham PoloMan.',
    canonicalPath: `/products/${id}`,
  })

  useEffect(() => {
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setPageErrorMessage('')
      setErrorMessage('')
      setSuccessMessage('')
    })

    productApi
      .getById(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data)
          setPageErrorMessage('')
          setSelectedColorIndex(0)
          setSelectedImageIndex(0)
          setSelectedSize('')
          setQuantity(1)
        }
      })
      .catch(async (error) => {
        try {
          const list = await productApi.getAll()
          const foundProduct = Array.isArray(list)
            ? list.find((item) => String(getProductId(item)) === String(id) || String(item?.slug) === String(id))
            : null

          if (isMounted && foundProduct) {
            setProduct(foundProduct)
            setSelectedColorIndex(0)
            setSelectedImageIndex(0)
            setSelectedSize('')
            setQuantity(1)
            return
          }
        } catch {
          // Keep original detail error.
        }

        if (isMounted) setPageErrorMessage(getApiMessage(error, 'Khong the tai chi tiet san pham.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    if (!product) return

    let isMounted = true

    Promise.resolve().then(() => {
      if (isMounted) setIsFavorite(favoriteStorage.hasItem(getProductId(product)))
    })

    return () => {
      isMounted = false
    }
  }, [product])

  useEffect(() => {
    if (!product) return undefined

    let isMounted = true
    const currentProductId = String(getProductId(product))

    productApi
      .getAll()
      .then((list) => {
        if (!isMounted || !Array.isArray(list)) return

        const activeProducts = list.filter((item) => item.active !== false && String(getProductId(item)) !== currentProductId)
        const sameCategory = activeProducts.filter((item) => {
          const categoryId = item?.category?.id || item?.category?._id || item?.categoryId || ''

          return productCategoryId && String(categoryId) === String(productCategoryId)
        })
        const otherProducts = activeProducts.filter((item) => !sameCategory.includes(item))

        setRecommendedProducts([...sameCategory, ...otherProducts].slice(0, 4))
      })
      .catch(() => {
        if (isMounted) setRecommendedProducts([])
      })

    return () => {
      isMounted = false
    }
  }, [product, productCategoryId])

  useEffect(() => {
    reviewImagesRef.current = reviewImages
  }, [reviewImages])

  useEffect(
    () => () => {
      reviewImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    },
    [],
  )

  const handleAddToCart = async () => {
    if (!product) return false

    if (sizes.length && !selectedSize) {
      setSuccessMessage('')
      setErrorMessage('Vui long chon kich thuoc.')
      return false
    }

    const cartItem = {
      productId: getProductId(product),
      slug: getProductSlug(product),
      name: productName,
      price: getProductPrice(product),
      image: mainImage,
      colorId: getProductColorId(selectedColor),
      colorName: getProductColorName(selectedColor),
      colorCode: getProductColorCode(selectedColor),
      sizeId: getProductSizeId(selectedSizeData),
      size: selectedSize || getProductSizeName(selectedSizeData),
      quantity,
    }

    const userId = getUserId(tokenStorage.getUser())

    try {
      if (userId) {
        await cartApi.addItem(userId, {
          productId: cartItem.productId,
          productName: cartItem.name,
          productImage: cartItem.image,
          colorId: cartItem.colorId,
          colorName: cartItem.colorName,
          sizeId: cartItem.sizeId,
          sizeName: cartItem.size,
          quantity: cartItem.quantity,
        })
      } else {
        cartStorage.addItem(cartItem)
      }

      setErrorMessage('')
      setSuccessMessage('Da them san pham vao gio hang.')
      playAddToCartEffect({
        sourceElement: addToCartButtonRef.current,
        imageElement: mainImageRef.current,
      })
      return true
    } catch (error) {
      setSuccessMessage('')
      setErrorMessage(getApiMessage(error, 'Khong the them san pham vao gio hang.'))
      return false
    }
  }

  const handleBuyNow = async () => {
    if (await handleAddToCart()) {
      navigate('/cart')
    }
  }

  const handleToggleFavorite = () => {
    if (!product) return

    const nextFavorite = favoriteStorage.toggleItem({
      productId: getProductId(product),
      slug: getProductSlug(product),
      name: productName,
      price: getProductPrice(product),
      image: mainImage,
      colorId: getProductColorId(selectedColor),
      colorName: getProductColorName(selectedColor),
      colorCode: getProductColorCode(selectedColor),
      sizeId: getProductSizeId(selectedSizeData),
      size: selectedSize || getProductSizeName(selectedSizeData),
    })

    setIsFavorite(nextFavorite)
    setSuccessMessage(nextFavorite ? 'Da luu san pham vao yeu thich.' : 'Da xoa san pham khoi yeu thich.')
    setErrorMessage('')
  }

  const showImageControls = imageUrls.length > 1

  const goToPreviousImage = () => {
    if (!showImageControls) return

    setSelectedImageIndex((current) => (current - 1 + imageUrls.length) % imageUrls.length)
  }

  const goToNextImage = () => {
    if (!showImageControls) return

    setSelectedImageIndex((current) => (current + 1) % imageUrls.length)
  }

  const handleReviewImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 4 - reviewImages.length))

    event.target.value = ''

    if (!files.length) return

    setReviewImages((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }

  const removeReviewImage = (imageId) => {
    setReviewImages((current) =>
      current.filter((image) => {
        if (image.id === imageId) {
          URL.revokeObjectURL(image.previewUrl)
          return false
        }

        return true
      }),
    )
  }

  const handlePreviewReviewSubmit = (event) => {
    event.preventDefault()
    setSuccessMessage('Da tao ban xem truoc danh gia. Chuc nang gui API se lam sau.')
    setErrorMessage('')
  }

  const reviewSamples = [
    {
      name: 'Minh Khang',
      rating: 5,
      fit: 'Mua size M - vua nguoi',
      text: 'Vai ao dung form, vai mem va mau ngoai doi dep hon anh. Giac mac gon nhung khong bi chat.',
    },
    {
      name: 'Quoc Bao',
      rating: 4,
      fit: 'Mua size L - thoai mai',
      text: 'Chat vai on, phan co ao dung dang. Minh cao 1m74 nang 70kg mac L la hop.',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-neutral-200 bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
      </div>
    )
  }

  if (pageErrorMessage || !product) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <h1 className="text-xl font-black text-neutral-950">Khong tim thay san pham</h1>
        <p className="mt-2 text-sm text-red-600">{pageErrorMessage || 'San pham khong ton tai.'}</p>
        <Link
          to="/products"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
        >
          Ve san pham
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-6 rounded-3xl bg-[linear-gradient(135deg,#fbfdf8_0%,#f2f8ef_46%,#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-emerald-900">
          San pham
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">{productName}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <div className="grid gap-4 sm:grid-cols-[86px_1fr]">
          <div className="scrollbar-hidden flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible">
            {(imageUrls.length ? imageUrls : [mainImage]).filter(Boolean).map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm ${
                  selectedImageIndex === index ? 'border-emerald-800 ring-2 ring-emerald-100' : 'border-emerald-100'
                }`}
              >
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
            {mainImage ? (
              <img
                ref={mainImageRef}
                src={mainImage}
                alt={productName}
                className="h-full max-h-[720px] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-neutral-400">
                No image
              </div>
            )}

            {showImageControls && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/88 text-2xl font-light text-emerald-950 shadow-[0_12px_30px_rgba(2,44,34,0.16)] backdrop-blur transition-all hover:scale-105 hover:bg-white sm:left-4 sm:h-12 sm:w-12"
                  aria-label="Anh truoc"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/88 text-2xl font-light text-emerald-950 shadow-[0_12px_30px_rgba(2,44,34,0.16)] backdrop-blur transition-all hover:scale-105 hover:bg-white sm:right-4 sm:h-12 sm:w-12"
                  aria-label="Anh tiep theo"
                >
                  ›
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-emerald-950/45 px-2.5 py-2 backdrop-blur">
                  {imageUrls.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-dot`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        selectedImageIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                      }`}
                      aria-label={`Chon anh ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm sm:p-6">
          <div>
            <h1 className="text-2xl font-black leading-tight text-emerald-950 sm:text-3xl">{productName}</h1>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-2xl font-black text-emerald-800">
                {formatCurrency(product.salePrice || product.price)}
              </span>
              {product.salePrice && (
                <span className="text-sm font-semibold text-neutral-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-4">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-950">Uu dai online</p>
            <div className="mt-3 space-y-2 text-sm text-emerald-900/75">
              <p>
                Nhap ma <span className="font-black text-emerald-950">JUN20</span> giam 20K don tu 499K
              </p>
              <p>
                Nhap ma <span className="font-black text-emerald-950">JUN50</span> giam 50K don tu 799K
              </p>
              <p>
                <span className="font-black text-emerald-950">Freeship</span> don tu 399K
              </p>
            </div>
          </div>

          {colors.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-950">
                Mau sac: {getProductColorName(selectedColor) || `Mau ${selectedColorIndex + 1}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color, index) => {
                  const colorImage = getProductImage(product, color)

                  return (
                    <button
                      key={`${getProductColorName(color)}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedColorIndex(index)
                        setSelectedImageIndex(0)
                        setSelectedSize('')
                        setQuantity(1)
                      }}
                      className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-white p-1 ${
                        selectedColorIndex === index ? 'border-emerald-800 ring-2 ring-emerald-100' : 'border-emerald-100'
                      }`}
                      title={getProductColorName(color)}
                    >
                      {colorImage ? (
                        <img src={colorImage} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span
                          className="h-full w-full rounded-full border border-neutral-200"
                          style={{ backgroundColor: getProductColorCode(color) || '#f5f5f5' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-emerald-950">Kich thuoc: {selectedSize || 'Chon size'}</p>
              <Link to="/size-guide" className="text-sm font-semibold text-emerald-700 underline">
                Huong dan chon size
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.length ? (
                sizes.map((size) => {
                  const disabled = Number(size?.quantity || 0) <= 0
                  const sizeName = getProductSizeName(size)

                  return (
                    <button
                      key={sizeName}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSize(sizeName)}
                      className={`h-12 min-w-12 rounded-md border px-4 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        selectedSize === sizeName
                          ? 'border-emerald-800 bg-emerald-800 text-white'
                          : 'border-emerald-100 bg-white text-emerald-950 hover:border-emerald-500'
                      }`}
                    >
                      {sizeName}
                    </button>
                  )
                })
              ) : (
                <p className="text-sm text-neutral-500">San pham chua co size.</p>
              )}
            </div>
            <p className="text-xs font-semibold text-emerald-900/55">
              Ton kho: {selectedSize ? selectedStock : getProductStock(product)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[168px_1fr]">
            <div className="flex h-14 items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="h-full px-5 text-xl font-black"
              >
                -
              </button>
              <span className="text-sm font-black">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                className="h-full px-5 text-xl font-black"
              >
                +
              </button>
            </div>
            <button
              ref={addToCartButtonRef}
              type="button"
              onClick={handleAddToCart}
              className="h-14 rounded-lg border border-emerald-700 bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-emerald-800 transition-colors hover:bg-emerald-50"
            >
              Them vao gio
            </button>
          </div>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex h-14 w-full items-center justify-center rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-sm transition-colors hover:bg-emerald-900"
          >
            Mua ngay
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg border px-5 text-sm font-black uppercase tracking-[0.12em] transition-colors ${
              isFavorite
                ? 'border-red-100 bg-red-50 text-red-600 hover:border-red-200'
                : 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <svg className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {isFavorite ? 'Da yeu thich' : 'Them vao yeu thich'}
          </button>

          {(successMessage || errorMessage) && (
            <p className={`text-sm font-semibold ${successMessage ? 'text-emerald-600' : 'text-red-600'}`}>
              {successMessage || errorMessage}
            </p>
          )}

          {product.description && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-950">Mo ta san pham</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-emerald-900/70">{product.description}</p>
            </div>
          )}
        </div>
      </section>

      {recommendedProducts.length > 0 && (
        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">
                Goi y tiep theo
              </p>
              <h2 className="mt-2 text-2xl font-black text-emerald-950">Co the ban se thich</h2>
            </div>
            <Link
              to="/products"
              className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-950"
            >
              Xem tat ca
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedProducts.map((item) => {
              const itemImage = getProductImage(item)
              const itemPrice = getProductPrice(item)

              return (
                <Link
                  key={getProductId(item) || getProductSlug(item)}
                  to={`/products/${getProductSlug(item)}`}
                  className="group overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/35 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/8"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-white">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={getProductName(item)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-emerald-950 group-hover:text-emerald-700">
                      {getProductName(item)}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-emerald-800">
                        {formatCurrency(item.salePrice || itemPrice)}
                      </span>
                      {item.salePrice && (
                        <span className="text-xs font-semibold text-neutral-400 line-through">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]">
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 border-b border-emerald-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">
                Danh gia san pham
              </p>
              <h2 className="mt-2 text-2xl font-black text-emerald-950">Khach hang noi gi</h2>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
              <span className="text-3xl font-black text-emerald-950">4.8</span>
              <div>
                <div className="text-sm text-amber-400">★★★★★</div>
                <p className="text-xs font-semibold text-emerald-900/55">128 danh gia</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {reviewSamples.map((review) => (
              <article key={review.name} className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-emerald-950">{review.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-emerald-800/60">{review.fit}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm text-amber-400">
                    {'★'.repeat(review.rating)}
                    <span className="text-emerald-100">{'★'.repeat(5 - review.rating)}</span>
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-emerald-900/70">{review.text}</p>
              </article>
            ))}
          </div>
        </div>

        <form onSubmit={handlePreviewReviewSubmit} className="rounded-3xl border border-emerald-100 bg-emerald-950 p-5 text-white shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">
            Viet danh gia
          </p>
          <h2 className="mt-2 text-2xl font-black">Chia se trai nghiem cua ban</h2>

          <div className="mt-5">
            <p className="text-sm font-bold text-white/80">Cham sao</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`text-4xl leading-none transition-transform hover:scale-110 ${
                    star <= reviewRating ? 'text-amber-300' : 'text-white/20'
                  }`}
                  aria-label={`Chon ${star} sao`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <label className="mt-5 grid gap-2">
            <span className="text-sm font-bold text-white/80">Binh luan</span>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              rows={5}
              placeholder="San pham mac len the nao, form co vua khong..."
              className="resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-emerald-300"
            />
          </label>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white/80">Anh danh gia</p>
              <span className="text-xs text-white/45">{reviewImages.length}/4 anh</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {reviewImages.map((image) => (
                <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-white/10">
                  <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeReviewImage(image.id)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/75 text-xs font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Xoa anh"
                  >
                    ×
                  </button>
                </div>
              ))}
              {reviewImages.length < 4 && (
                <button
                  type="button"
                  onClick={() => reviewImageInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-emerald-300/70 bg-white/8 text-2xl font-light text-emerald-100 transition-colors hover:bg-white/14"
                  aria-label="Them anh danh gia"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={reviewImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleReviewImagesChange}
              className="sr-only"
            />
          </div>

          <button
            type="submit"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-950 transition-colors hover:bg-emerald-200"
          >
            Xem truoc danh gia
          </button>
          <p className="mt-3 text-xs leading-5 text-white/45">
            Giao dien nay chi luu tam tren man hinh, chua gui API.
          </p>
        </form>
      </section>
    </div>
  )
}

export default ProductDetail
