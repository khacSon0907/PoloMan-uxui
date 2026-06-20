import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  Filter,
  Gift,
  Grid2X2,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from 'lucide-react'

import { categoryApi, flattenCategoryTree, normalizeCategoryTree } from '../features/category'
import {
  favoriteStorage,
  formatCurrency,
  getProductColors,
  getProductColorCode,
  getProductId,
  getProductImage,
  getProductName,
  getProductPrice,
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

function getCategoryImage(category) {
  if (typeof category?.image === 'string') return category.image

  return (
    category?.image?.url ||
    category?.image?.secureUrl ||
    category?.imageUrl ||
    category?.thumbnailUrl ||
    category?.thumbnail ||
    category?.bannerUrl ||
    ''
  )
}

function getActiveCategoryChildren(category) {
  return Array.isArray(category?.children) ? category.children.filter((child) => child?.active !== false) : []
}

function categoryContainsValue(category, selectedValue) {
  const selected = normalizeValue(selectedValue)
  if (!selected) return false

  const ownValues = [category?.id, category?._id, category?.slug, category?.name].map(normalizeValue)
  if (ownValues.includes(selected)) return true

  return getActiveCategoryChildren(category).some((child) => categoryContainsValue(child, selectedValue))
}

function getCategoryRequestId(categories, selectedCategory) {
  if (selectedCategory === 'all') return 'all'

  const selected = normalizeValue(selectedCategory)
  const matchedCategory = flattenCategoryTree(categories).find((category) =>
    [category?.id, category?._id, category?.slug, category?.name].map(normalizeValue).includes(selected),
  )

  return matchedCategory?.id || matchedCategory?._id || selectedCategory
}

function getDiscountPercent(product) {
  const price = Number(product?.price || 0)
  const salePrice = Number(product?.salePrice || 0)

  if (!price || !salePrice || salePrice >= price) return 0

  return Math.round(((price - salePrice) / price) * 100)
}

function getSelectedCategoryName(categoryOptions, selectedCategoryRequestId) {
  return categoryOptions.find((category) => category.id === selectedCategoryRequestId)?.rawName || 'San pham'
}

const priceFilters = [
  { id: 'under-500', label: 'Duoi 500.000d', min: 0, max: 500000 },
  { id: '500-800', label: '500.000d - 800.000d', min: 500000, max: 800000 },
  { id: '800-1200', label: '800.000d - 1.200.000d', min: 800000, max: 1200000 },
  { id: 'over-1200', label: 'Tren 1.200.000d', min: 1200000, max: Infinity },
]

function productMatchesPrice(product, selectedPriceFilters) {
  if (!selectedPriceFilters.length) return true

  const price = getProductPrice(product)

  return selectedPriceFilters.some((filterId) => {
    const filter = priceFilters.find((item) => item.id === filterId)
    if (!filter) return false
    if (filter.max === Infinity) return price >= filter.min
    return price >= filter.min && price < filter.max
  })
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPriceFilters, setSelectedPriceFilters] = useState([])
  const [sortMode, setSortMode] = useState('newest')
  const [viewMode, setViewMode] = useState('grid')
  const [categories, setCategories] = useState([])
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set())
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
    description: 'Kham pha san pham thoi trang nam PoloMan theo danh muc va muc gia.',
    canonicalPath: '/products',
  })

  useEffect(() => {
    let isMounted = true

    categoryApi
      .list()
      .then((categoryList) => {
        if (!isMounted) return

        if (Array.isArray(categoryList)) {
          const normalizedCategories = normalizeCategoryTree(categoryList)
          setCategories(normalizedCategories)
          setExpandedCategoryIds(
            new Set(
              normalizedCategories
                .filter((category) => getActiveCategoryChildren(category).length > 0)
                .map((category) => String(getCategoryOptionValue(category))),
            ),
          )
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
      { id: 'all', name: 'Tat ca', rawName: 'Tat ca' },
      ...flattenCategoryTree(categories, { onlyActive: true }).map((category) => ({
        id: getCategoryOptionValue(category),
        name: category.label,
        rawName: category.name || category.label,
        level: category.level,
        category,
      })),
    ],
    [categories],
  )

  const selectedCategoryName = useMemo(
    () => getSelectedCategoryName(categoryOptions, selectedCategoryRequestId),
    [categoryOptions, selectedCategoryRequestId],
  )
  const selectedCategoryOption = useMemo(
    () => categoryOptions.find((category) => category.id === selectedCategoryRequestId),
    [categoryOptions, selectedCategoryRequestId],
  )
  const selectedCategoryImage = getCategoryImage(selectedCategoryOption?.category)

  const filteredProducts = useMemo(() => {
    const nextProducts = products.filter((product) => productMatchesPrice(product, selectedPriceFilters))

    return [...nextProducts].sort((first, second) => {
      if (sortMode === 'price-asc') return getProductPrice(first) - getProductPrice(second)
      if (sortMode === 'price-desc') return getProductPrice(second) - getProductPrice(first)
      if (sortMode === 'name') return getProductName(first).localeCompare(getProductName(second), 'vi')

      return new Date(second?.createdAt || 0).getTime() - new Date(first?.createdAt || 0).getTime()
    })
  }, [products, selectedPriceFilters, sortMode])

  const handlePriceFilterChange = (filterId) => {
    setSelectedPriceFilters((current) =>
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId],
    )
  }

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

  const handleToggleCategoryGroup = (categoryId) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current)
      const normalizedId = String(categoryId)

      if (next.has(normalizedId)) {
        next.delete(normalizedId)
      } else {
        next.add(normalizedId)
      }

      return next
    })
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

  const renderCategoryNode = (category, level = 0) => {
    const categoryId = getCategoryOptionValue(category)
    const children = getActiveCategoryChildren(category)
    const hasChildren = children.length > 0
    const isExpanded = expandedCategoryIds.has(String(categoryId))
    const isSelected = selectedCategoryRequestId !== 'all' && normalizeValue(selectedCategoryRequestId) === normalizeValue(categoryId)
    const isInsideSelectedPath = categoryContainsValue(category, selectedCategoryRequestId)

    return (
      <div key={categoryId || category.name} className="space-y-1.5">
        <button
          type="button"
          onClick={() => (hasChildren ? handleToggleCategoryGroup(categoryId) : handleCategoryChange(categoryId))}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
            isSelected
              ? 'bg-emerald-50 font-black text-emerald-900'
              : isInsideSelectedPath && hasChildren
                ? 'bg-emerald-50/70 font-black text-emerald-900'
                : 'font-semibold text-emerald-950/75 hover:bg-emerald-50/60'
          }`}
          style={{ paddingLeft: `${12 + Number(level || 0) * 14}px` }}
        >
          <span className="min-w-0 flex-1 truncate">{category.name}</span>
          {hasChildren && (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-emerald-900/50 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-1.5">
            {children.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0 bg-[radial-gradient(circle_at_top_right,#edf7ef_0%,#ffffff_34%,#f8fbf8_100%)]">
      <section className="grid gap-3 border-b border-emerald-50 bg-emerald-50/50 px-4 py-2 text-xs font-bold text-emerald-800 sm:grid-cols-3 sm:px-6 lg:px-10">
        <span className="inline-flex items-center justify-center gap-2">
          <Truck className="h-4 w-4" />
          Don tu 590K; Tang vo cotton
        </span>
        <span className="inline-flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4" />
          Don tu 890K; Tang doi vo + kinh mat
        </span>
        <span className="inline-flex items-center justify-center gap-2">
          <Gift className="h-4 w-4" />
          Freeship don tu 500K
        </span>
      </section>

      <section className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
        <div className="relative z-10">
          <nav className="text-sm text-emerald-900/55">
            <Link to="/" className="hover:text-emerald-900">Trang chu</Link>
            <span className="mx-2">/</span>
            <Link to="/products" className="hover:text-emerald-900">San pham</Link>
            <span className="mx-2">/</span>
            <span className="font-bold text-emerald-950">{selectedCategoryName}</span>
          </nav>
          <h1 className="mt-7 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
            {selectedCategoryName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-900/70">
            Kham pha bo suu tap PoloMan thanh lich va thoai mai, phu hop moi phong cach.
          </p>
        </div>
        <div className="pointer-events-none absolute right-8 top-0 hidden h-full w-[38%] overflow-hidden lg:block">
          {selectedCategoryImage ? (
            <div className="absolute bottom-0 right-0 h-[88%] w-[86%] overflow-hidden rounded-tl-[120px] bg-emerald-50 shadow-[0_25px_70px_rgba(15,76,58,0.12)]">
              <img
                src={selectedCategoryImage}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.14),rgba(255,255,255,0))]" />
            </div>
          ) : (
            <>
              <div className="absolute right-10 top-10 h-52 w-52 rounded-full bg-emerald-100" />
              <div className="absolute bottom-2 right-0 h-52 w-72 rounded-t-full bg-[linear-gradient(135deg,#f3ead9,#d8c8ac)] opacity-80" />
              <div className="absolute bottom-6 right-24 h-64 w-24 rotate-6 rounded-t-3xl bg-[#ece4d5] shadow-2xl" />
              <div className="absolute bottom-8 right-44 h-60 w-24 -rotate-3 rounded-t-3xl bg-[#f7f3ea] shadow-xl" />
            </>
          )}
        </div>
      </section>

      <section className="grid gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,76,58,0.08)]">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-emerald-950">
                <Grid2X2 className="h-4 w-4" />
                Danh muc
              </h2>
              <ChevronDown className="h-4 w-4 text-emerald-900/50" />
            </div>
            <div className="mt-5 space-y-1.5">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategoryRequestId === 'all'
                    ? 'bg-emerald-50 font-black text-emerald-900'
                    : 'font-semibold text-emerald-950/75 hover:bg-emerald-50/60'
                }`}
              >
                <span>Tat ca</span>
              </button>

              {categories.filter((category) => category?.active !== false).map((category) => renderCategoryNode(category))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,76,58,0.08)]">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-emerald-950">
                <Filter className="h-4 w-4" />
                Bo loc
              </h2>
              <ChevronDown className="h-4 w-4 text-emerald-900/50" />
            </div>

            <div className="mt-5">
              <h3 className="flex items-center justify-between text-sm font-black text-emerald-950">
                Gia
                <ChevronDown className="h-4 w-4 text-emerald-900/50" />
              </h3>
              <div className="mt-3 space-y-3">
                {priceFilters.map((filter) => {
                  const count = products.filter((product) => productMatchesPrice(product, [filter.id])).length
                  const isChecked = selectedPriceFilters.includes(filter.id)

                  return (
                    <label
                      key={filter.id}
                      className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-emerald-950/75"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked ? 'border-emerald-800 bg-emerald-800' : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isChecked && <span className="h-2 w-2 rounded-sm bg-white" />}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePriceFilterChange(filter.id)}
                        className="sr-only"
                      />
                      <span className="flex-1">{filter.label}</span>
                      <span className="text-xs text-neutral-400">({count})</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,76,58,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-900/70">
              Hien thi <span className="font-black text-emerald-800">{filteredProducts.length}</span> san pham
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                  className="h-11 min-w-44 appearance-none rounded-xl border border-neutral-200 bg-white px-4 pr-10 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-600"
                >
                  <option value="newest">Sap xep: Moi nhat</option>
                  <option value="price-asc">Gia tang dan</option>
                  <option value="price-desc">Gia giam dan</option>
                  <option value="name">Ten A-Z</option>
                </select>
              </label>
              <div className="flex h-11 items-center rounded-xl border border-neutral-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-800' : 'text-neutral-500'}`}
                  aria-label="Grid view"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-800' : 'text-neutral-500'}`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="mt-6 flex min-h-80 items-center justify-center rounded-2xl border border-neutral-100 bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className={`mt-6 grid gap-5 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {filteredProducts.map((prod, index) => {
                const imageUrl = getProductImage(prod)
                const discountPercent = getDiscountPercent(prod)
                const colors = getProductColors(prod)
                const isFavorite = favoriteIds.has(String(getProductId(prod)))

                return (
                  <Link
                    key={getProductId(prod) || index}
                    to={`/products/${getProductSlug(prod)}`}
                    className={`group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_35px_rgba(15,76,58,0.1)] ${
                      viewMode === 'list' ? 'grid gap-4 p-3 sm:grid-cols-[220px_minmax(0,1fr)]' : 'flex h-full flex-col'
                    }`}
                  >
                    <div className={`relative overflow-hidden rounded-xl bg-neutral-50 ${viewMode === 'list' ? 'aspect-[4/3] sm:aspect-square' : 'aspect-square'}`}>
                      {discountPercent > 0 ? (
                        <span className="absolute left-3 top-3 z-10 rounded-md bg-emerald-800 px-2 py-1 text-xs font-black text-white">
                          -{discountPercent}%
                        </span>
                      ) : index < 2 ? (
                        <span className="absolute left-3 top-3 z-10 rounded-md bg-emerald-800 px-2 py-1 text-xs font-black text-white">
                          NEW
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => handleToggleFavorite(event, prod)}
                        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition-colors ${
                          isFavorite ? 'border-red-100 text-red-600' : 'border-neutral-100 text-emerald-950 hover:text-red-600'
                        }`}
                        aria-label="Yeu thich"
                      >
                        <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={prod.name}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-base font-bold leading-6 text-emerald-950 group-hover:text-emerald-700">
                        {getProductName(prod)}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg font-black text-emerald-800">
                          {formatCurrency(prod.salePrice || prod.price)}
                        </span>
                        {prod.salePrice && (
                          <span className="text-xs text-neutral-400 line-through">{formatCurrency(prod.price)}</span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {colors.slice(0, 4).map((color, colorIndex) => (
                          <span
                            key={`${getProductId(prod)}-${colorIndex}`}
                            className="h-6 w-6 rounded-full border border-neutral-200"
                            style={{ backgroundColor: getProductColorCode(color) || ['#e6d7c1', '#d8d8d8', '#111111', '#17264b'][colorIndex] || '#f3f4f6' }}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
              <SlidersHorizontal className="mx-auto h-10 w-10 text-neutral-400" />
              <h3 className="mt-4 text-sm font-black text-neutral-800">Khong co san pham</h3>
              <p className="mt-1 text-sm text-neutral-500">Hay thu doi danh muc hoac muc gia dang loc.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Products
