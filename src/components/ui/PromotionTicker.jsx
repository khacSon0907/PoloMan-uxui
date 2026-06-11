import { useEffect, useMemo, useState } from 'react'
import { Autoplay, FreeMode } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'

import { promotionBannerApi } from '../../features/promotionBanner'

function sortPromotions(first, second) {
  return Number(first.sortOrder || 0) - Number(second.sortOrder || 0)
}

function PromotionTicker() {
  const [items, setItems] = useState([])
  const [isHidden, setIsHidden] = useState(false)
  const visibleItems = useMemo(
    () => items.filter((item) => item?.title?.trim()).sort(sortPromotions),
    [items],
  )
  const swiperItems = useMemo(() => {
    if (!visibleItems.length) return []

    return visibleItems.length < 6
      ? Array.from({ length: Math.ceil(6 / visibleItems.length) }, () => visibleItems).flat()
      : visibleItems
  }, [visibleItems])

  useEffect(() => {
    let isMounted = true

    promotionBannerApi
      .listActive()
      .then((list) => {
        if (!isMounted) return

        setItems(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (isMounted) {
          setItems([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsHidden(window.scrollY > 24)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  if (!swiperItems.length) return null

  return (
    <section
      className={`overflow-hidden border-b border-emerald-100 bg-[#f7faf5] text-emerald-950 transition-all duration-300 ease-out ${
        isHidden ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
      }`}
    >
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <Swiper
          modules={[Autoplay, FreeMode]}
          loop={swiperItems.length > 1}
          speed={9000}
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          freeMode
          allowTouchMove={false}
          observer
          observeParents
          slidesPerView="auto"
          spaceBetween={42}
          className="promotion-swiper min-h-10 w-full"
        >
          {swiperItems.map((item, index) => (
            <SwiperSlide
              key={`${item.id || item.title}-${index}`}
              className="!w-auto min-w-[260px] sm:min-w-[340px] lg:min-w-[420px]"
            >
              <div className="flex min-h-10 items-center justify-center gap-3 text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-emerald-950/85 sm:text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-800">
                  <span className="sr-only">Promotion</span>
                </span>
                <span className="line-clamp-1">{item.title}</span>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}

export default PromotionTicker
