import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { categoryApi } from '../features/category'
import { usePageMeta } from '../shared/hooks/usePageMeta'

const fallbackCategories = [
  { id: 'polo', name: 'Áo Polo', slug: 'polo', active: true },
  { id: 'shirt', name: 'Áo Sơ Mi', slug: 'shirt', active: true },
  { id: 'trouser', name: 'Quần Nam', slug: 'trouser', active: true },
  { id: 'accessory', name: 'Phụ kiện', slug: 'accessory', active: true },
]

function matchesCategory(productCategory, selectedCategory) {
  if (selectedCategory === 'all') return true

  const normalizedSelected = selectedCategory.toLowerCase()
  const aliasMap = {
    'ao-polo': 'polo',
    'ao-so-mi': 'shirt',
    'quan-nam': 'trouser',
    'quan-khaki': 'trouser',
    'phu-kien': 'accessory',
  }

  return productCategory === (aliasMap[normalizedSelected] || normalizedSelected)
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSize, setSelectedSize] = useState('all')
  const [categories, setCategories] = useState(fallbackCategories)
  const selectedCategory = searchParams.get('category') || 'all'

  usePageMeta({
    title: 'Danh sách sản phẩm PoloMan | Áo polo, sơ mi, quần nam',
    description:
      'Khám phá danh sách sản phẩm thời trang nam PoloMan theo danh mục, kích thước và phong cách hiện đại.',
    canonicalPath: '/products',
  })

  useEffect(() => {
    let isMounted = true

    categoryApi
      .list()
      .then((list) => {
        if (!isMounted || !Array.isArray(list) || !list.length) return
        setCategories(list.filter((category) => category.active !== false))
      })
      .catch(() => {
        if (isMounted) setCategories(fallbackCategories)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const categoryOptions = useMemo(
    () => [
      { id: 'all', name: 'Tất cả' },
      ...(categories.length ? categories : fallbackCategories).map((category) => ({
        id: category.slug || category.id || category.name,
        name: category.name,
      })),
    ],
    [categories],
  )

  const handleCategoryChange = (categoryId) => {
    if (categoryId === 'all') {
      setSearchParams({})
      return
    }
    setSearchParams({ category: categoryId })
  }

  const productsList = [
    { id: 1, name: 'Áo Polo Signature Cotton Pima', price: 380000, category: 'polo', size: 'M', image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=400&auto=format&fit=crop' },
    { id: 2, name: 'Áo Sơ Mi Linen Cổ Tàu', price: 420000, category: 'shirt', size: 'L', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=400&auto=format&fit=crop' },
    { id: 3, name: 'Quần Khaki Premium Slim-fit', price: 495000, category: 'trouser', size: 'XL', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=400&auto=format&fit=crop' },
    { id: 4, name: 'Áo Polo Active Pro Thể Thao', price: 350000, category: 'polo', size: 'M', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=400&auto=format&fit=crop' },
    { id: 5, name: 'Áo Sơ Mi Oxford Cotton Họa Tiết', price: 460000, category: 'shirt', size: 'M', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=400&auto=format&fit=crop' },
    { id: 6, name: 'Quần Tây Âu Luxury Crepe', price: 550000, category: 'trouser', size: 'L', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400&auto=format&fit=crop' },
    { id: 7, name: 'Áo Polo Knit Họa Tiết Sang Trọng', price: 590000, category: 'polo', size: 'L', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=400&auto=format&fit=crop' },
    { id: 8, name: 'Kính Mát Thời Trang PoloMan', price: 290000, category: 'accessory', size: 'all', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=400&auto=format&fit=crop' },
  ]

  // Filter Logic
  const filteredProducts = productsList.filter(prod => {
    const categoryMatch = matchesCategory(prod.category, selectedCategory)
    const sizeMatch = selectedSize === 'all' || prod.size === selectedSize || prod.size === 'all'
    return categoryMatch && sizeMatch
  })

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-neutral-950 border border-neutral-900 rounded-2xl relative overflow-hidden">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Danh sách sản phẩm</h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-lg">Tổng hợp tất cả thiết kế tối giản, tuyển chọn cao cấp giúp nâng tầm phong thái của bạn.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* SIDEBAR FILTERS */}
        <aside className="w-full lg:w-64 space-y-6 flex-shrink-0">
          <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl space-y-6">

            {/* Category Filter */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">Danh mục</h3>
              <div className="space-y-1.5">
                {categoryOptions.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${selectedCategory === cat.id
                        ? 'bg-black text-white font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200 hover:text-black'
                      }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-neutral-200" />

            {/* Size Filter */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest">Kích thước</h3>
              <div className="flex flex-wrap gap-2">
                {['all', 'S', 'M', 'L', 'XL'].map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-8 min-w-8 px-2 rounded-md border text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer ${selectedSize === size
                        ? 'bg-black text-white border-black'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-black'
                      }`}
                  >
                    {size === 'all' ? 'Tất cả' : size}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* PRODUCTS GRID */}
        <div className="flex-grow space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400">Hiển thị <span className="text-neutral-800 font-bold">{filteredProducts.length}</span> sản phẩm</p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-400 transition-all flex flex-col h-full relative">
                  <div className="h-60 overflow-hidden relative bg-neutral-100">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 grayscale group-hover:grayscale-0"
                    />
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-neutral-800 group-hover:text-black transition-colors text-xs line-clamp-2">
                        {prod.name}
                      </h3>
                      <p className="text-black font-extrabold text-sm">{(prod.price).toLocaleString()}đ</p>
                    </div>
                    <button className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-bold rounded-md text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-neutral-50 border border-neutral-200 rounded-xl">
              <span className="text-3xl">🔍</span>
              <h3 className="text-sm font-bold text-neutral-800 mt-4">Không tìm thấy sản phẩm</h3>
              <p className="text-xs text-neutral-500 mt-1">Vui lòng thử bộ lọc khác.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Products
