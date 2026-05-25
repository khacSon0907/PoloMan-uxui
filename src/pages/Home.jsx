import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { categoryApi } from '../features/category'
import { usePageMeta } from '../shared/hooks/usePageMeta'

const fallbackCategories = [
  { id: 'polo', name: 'Áo Polo', slug: 'ao-polo', description: 'Phong cách lịch lãm cho mỗi ngày.', active: true },
  { id: 'shirt', name: 'Áo Sơ Mi', slug: 'ao-so-mi', description: 'Form gọn, chất liệu thoáng mát.', active: true },
  { id: 'trouser', name: 'Quần Nam', slug: 'quan-nam', description: 'Dễ phối, đứng phom, hiện đại.', active: true },
  { id: 'accessory', name: 'Phụ Kiện', slug: 'phu-kien', description: 'Điểm nhấn hoàn thiện outfit.', active: true },
]

const categoryImages = [
  'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1622434641406-a158123450f9?q=80&w=300&auto=format&fit=crop',
]

function Home() {
  const [categories, setCategories] = useState(fallbackCategories)

  usePageMeta({
    title: 'PoloMan Store | Thời trang nam cao cấp',
    description:
      'PoloMan Store cung cấp áo polo, áo sơ mi, quần nam và phụ kiện thời trang nam cao cấp với phong cách hiện đại.',
    canonicalPath: '/',
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

  const visibleCategories = useMemo(
    () => (categories.length ? categories.slice(0, 4) : fallbackCategories),
    [categories],
  )

  const featuredProducts = [
    {
      id: 1,
      name: 'Áo Polo Signature Cotton Pima',
      price: '380.000đ',
      oldPrice: '450.000đ',
      tag: 'Bán chạy',
      image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=400&auto=format&fit=crop',
    },
    {
      id: 2,
      name: 'Áo Sơ Mi Linen Cổ Tàu',
      price: '420.000đ',
      tag: 'Mới về',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=400&auto=format&fit=crop',
    },
    {
      id: 3,
      name: 'Quần Khaki Premium Slim-fit',
      price: '495.000đ',
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=400&auto=format&fit=crop',
    },
    {
      id: 4,
      name: 'Áo Polo Active Pro Thể Thao',
      price: '350.000đ',
      oldPrice: '390.000đ',
      tag: 'Ưu đãi',
      image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=400&auto=format&fit=crop',
    },
  ]

  return (
    <div className="space-y-20 pb-12">
      {/* 1. HERO SECTION (HIGH-CONTRAST MONOCHROME BANNER) */}
      <section className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-900">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <span className="inline-flex px-3 py-1 bg-white/10 text-white border border-white/20 rounded-md text-xs font-bold uppercase tracking-widest">
              BST MÙA HÈ 2026
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white uppercase font-sans">
              NÂNG TẦM <br />
              <span className="text-neutral-400">PHONG THÁI</span>
            </h1>
            <p className="text-neutral-400 text-sm max-w-sm mx-auto md:mx-0 leading-relaxed">
              Khám phá các thiết kế tối giản, tinh tế hàng đầu. Chất liệu cao cấp chuẩn phom tôn dáng thời thượng cho quý ông hiện đại.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-2">
              <Link to="/products" className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-neutral-200 text-neutral-950 font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all text-center text-xs tracking-wider uppercase cursor-pointer">
                Mua Ngay
              </Link>
              <Link to="/collections" className="w-full sm:w-auto px-8 py-3 bg-transparent hover:bg-white/10 text-white font-bold rounded-md border border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-center text-xs tracking-wider uppercase cursor-pointer">
                Xem BST Mới
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-sm md:max-w-none">
            <img
              src="https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop"
              alt="PoloMan Hero"
              className="w-full h-[380px] object-cover rounded-md border border-neutral-800 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {[
          { icon: '🚚', title: 'Miễn Phí Vận Chuyển', desc: 'Đơn hàng từ 499.000đ toàn quốc' },
          { icon: '🔄', title: 'Đổi Trả Dễ Dàng', desc: 'Hỗ trợ đổi trả trong vòng 30 ngày' },
          { icon: '✨', title: 'Chất Liệu Cao Cấp', desc: 'Quy trình kiểm định chất lượng chặt chẽ' },
          { icon: '💬', title: 'Hỗ Trợ Tận Tâm', desc: 'Đội ngũ chăm sóc khách hàng 24/7' },
        ].map((item, idx) => (
          <div key={idx} className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl hover:border-neutral-400 transition-all flex items-center gap-4">
            <span className="text-2xl p-2.5 bg-white border border-neutral-100 rounded-lg">{item.icon}</span>
            <div>
              <h3 className="font-bold text-neutral-800 text-sm">{item.title}</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* 3. CURATED CATEGORIES */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-widest">Danh mục nổi bật</h2>
          <p className="text-xs text-neutral-400">Thiết kế tối giản, tôn vinh bản sắc phái mạnh</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {visibleCategories.map((cat, idx) => (
            <Link
              key={cat.id || cat.slug || cat.name}
              to={`/products?category=${cat.slug || cat.id || 'all'}`}
              className="group relative p-6 rounded-xl bg-[linear-gradient(135deg,#fff7ed_0%,#fdf2f8_45%,#eef2ff_100%)] border border-pink-100 hover:border-fuchsia-500 transition-all overflow-hidden flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="z-10 space-y-0.5">
                <h3 className="text-lg font-extrabold text-neutral-900 group-hover:text-black transition-colors uppercase tracking-tight">{cat.name}</h3>
                <p className="text-[10px] text-fuchsia-600 font-semibold">{cat.description || 'Khám phá bộ sưu tập'}</p>
              </div>
              <img
                src={categoryImages[idx % categoryImages.length]}
                alt={cat.name}
                className="absolute -right-4 -bottom-4 w-24 h-24 object-cover rounded-md opacity-60 group-hover:scale-105 group-hover:opacity-100 transition-all -rotate-12 grayscale group-hover:grayscale-0"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* 4. BEST SELLERS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-widest">SẢN PHẨM BÁN CHẠY</h2>
            <p className="text-xs text-neutral-400">Các thiết kế tinh tế được săn đón nhiều nhất</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-neutral-900 hover:underline uppercase tracking-wider flex items-center gap-1">
            Tất cả sản phẩm
            <span>→</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((prod) => (
            <div key={prod.id} className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-400 transition-all flex flex-col h-full relative">
              {prod.tag && (
                <span className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-black text-[9px] font-bold text-white uppercase rounded tracking-wider">
                  {prod.tag}
                </span>
              )}
              <div className="h-64 overflow-hidden relative bg-neutral-100">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 grayscale group-hover:grayscale-0"
                />
                <button className="absolute right-3 bottom-3 p-2 bg-white/80 border border-neutral-250 backdrop-blur-md rounded-full text-neutral-600 hover:text-black hover:bg-white hover:scale-105 transition-all cursor-pointer">
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-800 group-hover:text-black transition-colors text-xs line-clamp-2">
                    {prod.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-black font-extrabold text-sm">{prod.price}</span>
                    {prod.oldPrice && (
                      <span className="text-[10px] text-neutral-400 line-through">{prod.oldPrice}</span>
                    )}
                  </div>
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
      </section>
    </div>
  )
}

export default Home
