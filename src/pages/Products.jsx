import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { categoryApi } from '../features/category'
import {
  favoriteStorage,
  formatCurrency,
  getProductColors,
  getProductId,
  getProductImage,
  getProductName,
  getProductPrice,
  getProductSizes,
  getProductSlug,
  productApi,
} from '../features/product'
import { getApiMessage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase()
}

function getCategoryOptionValue(category) {
  return category?.id || category?._id || category?.slug || category?.name
}

function getCategoryRequestId(categories, selectedCategory) {
  if (selectedCategory === 'all') return 'all'

  const selected = normalizeValue(selectedCategory)
  const matchedCategory = categories.find((category) =>
    [category?.id, category?._id, category?.slug, category?.name].map(normalizeValue).includes(selected),
  )

  return matchedCategory?.id || matchedCategory?._id || selectedCategory
}

function productMatchesSize(product, selectedSize) {
  if (selectedSize === 'all') return true

  const colors = getProductColors(product)

  if (!colors.length) {
    return getProductSizes(product).some((size) => normalizeValue(size?.size) === normalizeValue(selectedSize))
  }

  return colors.some((color) =>
    getProductSizes(product, color).some((size) => normalizeValue(size?.size) === normalizeValue(selectedSize)),
  )
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSize, setSelectedSize] = useState('all')
  const [categories, setCategories] = useState([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [products, setProducts] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(() =>
    new Set(favoriteStorage.getItems().map((item) => String(item.productId))),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const selectedCategory = searchParams.get('category') || 'all'
  const selectedCategoryRequestId = useMemo(
    () => getCategoryRequestId(categories, selectedCategory),
    [categories, selectedCategory],
  )

  usePageMeta({
    title: 'Danh sach san pham PoloMan',
    description: 'Kham pha san pham thoi trang nam PoloMan theo danh muc va kich thuoc.',
    canonicalPath: '/products',
  })

  useEffect(() => {
    let isMounted = true

    categoryApi
      .list()
      .then((categoryList) => {
        if (!isMounted) return

        if (Array.isArray(categoryList)) {
          setCategories(categoryList.filter((category) => category.active !== false))
        }
      })
      .catch(() => {
        if (isMounted) setCategories([])
      })
      .finally(() => {
        if (isMounted) setCategoriesLoaded(true)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedCategory !== 'all' && !categoriesLoaded) return

    let isMounted = true

    Promise.resolve().then(() => {
      if (!isMounted) return

      setIsLoading(true)
      setErrorMessage('')
    })

    const productsRequest =
      selectedCategory === 'all' ? productApi.getAll() : productApi.getByCategoryId(selectedCategoryRequestId)

    productsRequest
      .then((productList) => {
        if (!isMounted) return

        if (Array.isArray(productList)) {
          setProducts(productList.filter((product) => product.active !== false))
        }
      })
      .catch((error) => {
        if (!isMounted) return

        setProducts([])
        setErrorMessage(getApiMessage(error, 'Khong the tai san pham.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [categoriesLoaded, selectedCategory, selectedCategoryRequestId])

  const categoryOptions = useMemo(
    () => [
      { id: 'all', name: 'Tat ca' },
      ...categories.map((category) => ({
        id: getCategoryOptionValue(category),
        name: category.name,
      })),
    ],
    [categories],
  )

  const sizeOptions = useMemo(() => {
    const sizes = new Set()
    products.forEach((product) => {
      const colors = getProductColors(product)

      if (!colors.length) {
        getProductSizes(product).forEach((size) => {
          if (size?.size) sizes.add(String(size.size).trim())
        })
        return
      }

      colors.forEach((color) => {
        getProductSizes(product, color).forEach((size) => {
          if (size?.size) sizes.add(String(size.size).trim())
        })
      })
    })

    return ['all', ...Array.from(sizes)]
  }, [products])

  const filteredProducts = useMemo(
    () => products.filter((product) => productMatchesSize(product, selectedSize)),
    [products, selectedSize],
  )

  const syncFavoriteIds = () => {
    setFavoriteIds(new Set(favoriteStorage.getItems().map((item) => String(item.productId))))
  }

  const handleCategoryChange = (categoryId) => {
    if (categoryId === 'all') {
      setSearchParams({})
      return
    }

    setSearchParams({ category: categoryId })
  }

  const handleToggleFavorite = (event, product) => {
    event.preventDefault()
    event.stopPropagation()

    const productId = getProductId(product)
    favoriteStorage.toggleItem({
      productId,
      slug: getProductSlug(product),
      name: getProductName(product) || product?.name,
      price: getProductPrice(product),
      image: getProductImage(product),
    })
    syncFavoriteIds()
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#f7fbf4_0%,#eef7ec_55%,#ffffff_100%)] p-5 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute -bottom-16 left-1/2 h-32 w-32 rounded-full bg-lime-100/70 blur-3xl" />
        <h1 className="relative text-xl font-black uppercase tracking-[0.14em] text-emerald-950 sm:text-2xl sm:tracking-widest">
          Danh sach san pham
        </h1>
        <p className="relative mt-2 max-w-lg text-xs leading-5 text-emerald-900/60">
          Tat ca san pham dang active duoc lay truc tiep tu he thong admin.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="w-full flex-shrink-0 space-y-6 lg:w-64">
          <div className="space-y-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5 lg:p-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-950">Danh muc</h3>
              <div className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-1.5 lg:overflow-visible lg:px-0 lg:pb-0">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`flex shrink-0 cursor-pointer items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-left text-xs font-semibold transition-all lg:w-full lg:py-1.5 ${
                      selectedCategoryRequestId === cat.id
                        ? 'bg-emerald-800 font-bold text-white'
                        : 'text-emerald-900/70 hover:bg-white hover:text-emerald-950'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-emerald-100" />

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-950">Kich thuoc</h3>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-extrabold transition-all ${
                      selectedSize === size
                        ? 'border-emerald-800 bg-emerald-800 text-white'
                        : 'border-emerald-100 bg-white text-emerald-900/65 hover:border-emerald-400 hover:text-emerald-950'
                    }`}
                  >
                    {size === 'all' ? 'Tat ca' : size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-grow space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400">
              Hien thi <span className="font-bold text-emerald-900">{filteredProducts.length}</span> san pham
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center rounded-lg border border-neutral-200 bg-white">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-6">
              {filteredProducts.map((prod, index) => {
                const imageUrl = getProductImage(prod)

                return (
                  <Link
                    key={getProductId(prod) || index}
                    to={`/products/${getProductSlug(prod)}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-emerald-50 sm:h-60 sm:aspect-auto">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={prod.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-grow flex-col justify-between space-y-4 p-5">
                      <div className="space-y-1">
                        <h3 className="line-clamp-2 text-sm font-bold text-emerald-950 transition-colors group-hover:text-emerald-700">
                          {prod.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-emerald-900">
                            {formatCurrency(prod.salePrice || prod.price)}
                          </span>
                          {prod.salePrice && (
                            <span className="text-[10px] text-neutral-400 line-through">
                              {formatCurrency(prod.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_44px] gap-2">
                        <span className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-800 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all group-hover:bg-emerald-900">
                          Mua ngay
                        </span>
                        <button
                          type="button"
                          onClick={(event) => handleToggleFavorite(event, prod)}
                          className={`flex items-center justify-center rounded-md border transition-colors ${
                            favoriteIds.has(String(getProductId(prod)))
                              ? 'border-red-100 bg-red-50 text-red-600'
                              : 'border-emerald-200 text-emerald-800 group-hover:border-emerald-700 group-hover:bg-emerald-50'
                          }`}
                          aria-label="Yeu thich"
                        >
                          <svg
                            className="h-4 w-4"
                            fill={favoriteIds.has(String(getProductId(prod))) ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center sm:p-12">
              <h3 className="mt-4 text-sm font-bold text-neutral-800">Khong co san pham</h3>
              <p className="mt-1 text-xs text-neutral-500">Hay tao san pham active trong trang admin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Products
