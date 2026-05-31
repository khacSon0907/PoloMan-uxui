import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { bannerApi } from '../features/banner'
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

const fallbackHeroBanner = {
  title: 'BST MUA HE 2026',
  subtitle:
    'Kham pha cac thiet ke toi gian, tinh te hang dau. Chat lieu cao cap chuan phom ton dang thoi thuong cho quy ong hien dai.',
  imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop',
  linkUrl: '/products',
}

function Home() {
  const [categories, setCategories] = useState(fallbackCategories)
  const [heroBanner, setHeroBanner] = useState(fallbackHeroBanner)

  usePageMeta({
    title: 'PoloMan Store | Thời trang nam cao cấp',
    description:
      'PoloMan Store cung cấp áo polo, áo sơ mi, quần nam và phụ kiện thời trang nam cao cấp với phong cách hiện đại.',
    canonicalPath: '/',
  })

  useEffect(() => {
    let isMounted = true

    Promise.allSettled([categoryApi.list(), bannerApi.listActive()])
      .then(([categoryResult, bannerResult]) => {
        if (!isMounted) return

        if (
          categoryResult.status === 'fulfilled' &&
          Array.isArray(categoryResult.value) &&
          categoryResult.value.length
        ) {
          setCategories(categoryResult.value.filter((category) => category.active !== false))
        }

        if (bannerResult.status === 'fulfilled' && Array.isArray(bannerResult.value)) {
          const activeBanner = [...bannerResult.value]
            .filter((banner) => banner?.active !== false && banner?.imageUrl)
            .sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0))[0]

          if (activeBanner) {
            setHeroBanner({
              title: activeBanner.title || fallbackHeroBanner.title,
              subtitle: activeBanner.subtitle || fallbackHeroBanner.subtitle,
              imageUrl: activeBanner.imageUrl,
              linkUrl: activeBanner.linkUrl || fallbackHeroBanner.linkUrl,
            })
          }
        }
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
    <div className="space-y-12 pb-8 sm:space-y-16 sm:pb-10 lg:space-y-20 lg:pb-12">
      {/* 1. HERO SECTION (HIGH-CONTRAST MONOCHROME BANNER) */}
      <section className="relative overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950 sm:rounded-xl">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 md:flex-row md:gap-10 lg:gap-12 lg:py-24">
          <div className="flex-1 space-y-5 text-center md:text-left lg:space-y-6">
            <span className="inline-flex px-3 py-1 bg-white/10 text-white border border-white/20 rounded-md text-xs font-bold uppercase tracking-widest">
              {heroBanner.title}
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white uppercase font-sans sm:text-4xl lg:text-6xl">
              NÂNG TẦM <br />
              <span className="text-neutral-400">PHONG THÁI</span>
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-neutral-400 md:mx-0">
              {heroBanner.subtitle}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-1 sm:flex-row sm:items-center md:justify-start">
              <Link to={heroBanner.linkUrl || '/products'} className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-neutral-200 text-neutral-950 font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all text-center text-xs tracking-wider uppercase cursor-pointer">
                Mua Ngay
              </Link>
              <Link to="/collections" className="w-full sm:w-auto px-8 py-3 bg-transparent hover:bg-white/10 text-white font-bold rounded-md border border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-center text-xs tracking-wider uppercase cursor-pointer">
                Xem BST Mới
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm flex-1 md:max-w-none">
            <img
              src={heroBanner.imageUrl}
              alt={heroBanner.title || 'PoloMan Hero'}
              className="aspect-[4/5] h-auto max-h-[420px] w-full rounded-md border border-neutral-800 object-cover shadow-2xl grayscale transition-all duration-700 hover:grayscale-0 sm:aspect-[5/4] md:aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {[
          { icon: '🚚', title: 'Miễn Phí Vận Chuyển', desc: 'Đơn hàng từ 499.000đ toàn quốc' },
          { icon: '🔄', title: 'Đổi Trả Dễ Dàng', desc: 'Hỗ trợ đổi trả trong vòng 30 ngày' },
          { icon: '✨', title: 'Chất Liệu Cao Cấp', desc: 'Quy trình kiểm định chất lượng chặt chẽ' },
          { icon: '💬', title: 'Hỗ Trợ Tận Tâm', desc: 'Đội ngũ chăm sóc khách hàng 24/7' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-all hover:border-neutral-400 sm:p-5 lg:p-6">
            <span className="shrink-0 rounded-md border border-neutral-100 bg-white p-2.5 text-2xl">{item.icon}</span>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:gap-6">
          {visibleCategories.map((cat, idx) => (
            <Link
              key={cat.id || cat.slug || cat.name}
              to={`/products?category=${cat.slug || cat.id || 'all'}`}
              className="group relative flex min-h-36 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-pink-100 bg-[linear-gradient(135deg,#fff7ed_0%,#fdf2f8_45%,#eef2ff_100%)] p-5 transition-all hover:border-fuchsia-500 sm:h-44 sm:p-6"
            >
              <div className="z-10 space-y-0.5">
                <h3 className="text-base font-extrabold uppercase tracking-tight text-neutral-900 transition-colors group-hover:text-black sm:text-lg">{cat.name}</h3>
                <p className="text-[10px] text-fuchsia-600 font-semibold">{cat.description || 'Khám phá bộ sưu tập'}</p>
              </div>
              <img
                src={categoryImages[idx % categoryImages.length]}
                alt={cat.name}
                className="absolute -right-4 -bottom-4 h-24 w-24 rounded-md object-cover opacity-60 -rotate-12 grayscale transition-all group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
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
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {featuredProducts.map((prod) => (
            <div key={prod.id} className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-neutral-400">
              {prod.tag && (
                <span className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-black text-[9px] font-bold text-white uppercase rounded tracking-wider">
                  {prod.tag}
                </span>
              )}
              <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 sm:h-64 sm:aspect-auto">
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
