import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  cartStorage,
  formatCurrency,
  getImageUrl,
  getProductColors,
  getProductId,
  getProductImage,
  getProductImages,
  getProductPrice,
  getProductSizes,
  getProductSlug,
  getProductStock,
  productApi,
} from '../features/product'
import { getApiMessage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [successMessage, setSuccessMessage] = useState('')

  const colors = useMemo(() => getProductColors(product), [product])
  const selectedColor = colors[selectedColorIndex] || colors[0]
  const images = useMemo(() => getProductImages(product, selectedColor), [product, selectedColor])
  const imageUrls = useMemo(() => images.map(getImageUrl).filter(Boolean), [images])
  const sizes = useMemo(() => getProductSizes(product, selectedColor), [product, selectedColor])
  const selectedSizeData = sizes.find((size) => size?.size === selectedSize)
  const selectedStock = Number(selectedSizeData?.quantity || 0)
  const mainImage = imageUrls[selectedImageIndex] || getProductImage(product, selectedColor)

  usePageMeta({
    title: product?.name ? `${product.name} | PoloMan` : 'Chi tiet san pham | PoloMan',
    description: product?.description || 'Chi tiet san pham PoloMan.',
    canonicalPath: `/products/${id}`,
  })

  useEffect(() => {
    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
    })

    productApi
      .getById(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data)
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

        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai chi tiet san pham.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const handleAddToCart = () => {
    if (!product) return false

    if (sizes.length && !selectedSize) {
      setSuccessMessage('')
      setErrorMessage('Vui long chon kich thuoc.')
      return false
    }

    cartStorage.addItem({
      productId: getProductId(product),
      slug: getProductSlug(product),
      name: product.name,
      price: getProductPrice(product),
      image: mainImage,
      colorName: selectedColor?.colorName || '',
      colorCode: selectedColor?.colorCode || '',
      size: selectedSize || selectedSizeData?.size || '',
      quantity,
    })

    setErrorMessage('')
    setSuccessMessage('Da them san pham vao gio hang.')
    return true
  }

  const handleBuyNow = () => {
    if (handleAddToCart()) {
      navigate('/cart')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-neutral-200 bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
      </div>
    )
  }

  if (errorMessage || !product) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <h1 className="text-xl font-black text-neutral-950">Khong tim thay san pham</h1>
        <p className="mt-2 text-sm text-red-600">{errorMessage || 'San pham khong ton tai.'}</p>
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
        <span className="text-emerald-950">{product.name}</span>
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

          <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="h-full max-h-[720px] w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-neutral-400">
                No image
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700/65">
              Ma san pham: {getProductId(product)}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-emerald-950 sm:text-3xl">{product.name}</h1>
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
                Mau sac: {selectedColor?.colorName || `Mau ${selectedColorIndex + 1}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color, index) => {
                  const colorImage = getProductImage(product, color)

                  return (
                    <button
                      key={`${color.colorName}-${index}`}
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
                      title={color.colorName}
                    >
                      {colorImage ? (
                        <img src={colorImage} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span
                          className="h-full w-full rounded-full border border-neutral-200"
                          style={{ backgroundColor: color.colorCode || '#f5f5f5' }}
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
              <a href="/size-guide" className="text-sm font-semibold text-emerald-700 underline">
                Huong dan chon size
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.length ? (
                sizes.map((size) => {
                  const disabled = Number(size?.quantity || 0) <= 0

                  return (
                    <button
                      key={size.size}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSize(size.size)}
                      className={`h-12 min-w-12 rounded-md border px-4 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        selectedSize === size.size
                          ? 'border-emerald-800 bg-emerald-800 text-white'
                          : 'border-emerald-100 bg-white text-emerald-950 hover:border-emerald-500'
                      }`}
                    >
                      {size.size}
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
    </div>
  )
}

export default ProductDetail
