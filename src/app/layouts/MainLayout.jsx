import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../../components/ui/Header'

function MainLayout({ children }) {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return (
    <div className="flex flex-col min-h-screen bg-[#fbfdf8] text-emerald-950 font-sans antialiased">
      <Header />

      <main className="flex-grow w-full max-w-[1500px] mx-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8">
        {children || <Outlet />}
      </main>

      <footer className="bg-[linear-gradient(135deg,#f8fbf4_0%,#eef7ec_100%)] border-t border-emerald-100 text-emerald-900/70 text-sm mt-auto">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-10 lg:py-16 lg:gap-12">
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-emerald-950">
              PoloMan Store
            </h3>
            <p className="text-sm leading-relaxed text-emerald-900/60">
              Thương hiệu thời trang nam tối giản cao cấp. Chúng tôi tập trung vào chất liệu tuyển chọn và các đường may tinh tế để mang lại sự tự tin lịch lãm nhất cho phái mạnh.
            </p>

            <div className="space-y-2 text-sm text-emerald-900/60">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>123 Đường 3/2, Quận 10, TP. Hồ Chí Minh</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Hotline: 1900 6789</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-3 text-sm text-emerald-900/60">
              <li><a href="/faq" className="hover:text-emerald-950 transition-colors">Câu hỏi thường gặp</a></li>
              <li><a href="/shipping" className="hover:text-emerald-950 transition-colors">Chính sách vận chuyển</a></li>
              <li><a href="/returns" className="hover:text-emerald-950 transition-colors">Chính sách đổi trả 30 ngày</a></li>
              <li><a href="/size-guide" className="hover:text-emerald-950 transition-colors">Hướng dẫn chọn size</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Danh mục sản phẩm
            </h4>
            <ul className="space-y-3 text-sm text-emerald-900/60">
              <li><a href="/category/polo" className="hover:text-emerald-950 transition-colors">Áo Polo Cao Cấp</a></li>
              <li><a href="/category/shirts" className="hover:text-emerald-950 transition-colors">Áo Sơ Mi Lịch Lãm</a></li>
              <li><a href="/category/trousers" className="hover:text-emerald-950 transition-colors">Quần Tây / Quần Khaki</a></li>
              <li><a href="/category/accessories" className="hover:text-emerald-950 transition-colors">Phụ kiện nam giới</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              Đăng ký nhận ưu đãi
            </h4>
            <p className="text-sm text-emerald-900/60">
              Nhận thông báo bộ sưu tập mới và ưu đãi đặc quyền sớm nhất từ PoloMan.
            </p>

            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email của bạn..."
                className="h-10 min-w-0 flex-grow rounded bg-white border border-emerald-100 px-3 text-sm text-emerald-800 placeholder-emerald-900/35 outline-none focus:border-emerald-700 transition-all"
              />
              <button className="h-10 rounded bg-emerald-800 px-5 text-sm font-bold text-white transition-all hover:bg-emerald-900 cursor-pointer">
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-emerald-100 bg-emerald-900 py-6 text-center text-sm text-white/75">
          <div className="max-w-[1500px] mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-10">
            <p>© {new Date().getFullYear()} PoloMan. Tất cả bản quyền được bảo lưu.</p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-white/60 sm:gap-4">
              <a href="/privacy" className="hover:text-white">Chính sách bảo mật</a>
              <span>•</span>
              <a href="/terms" className="hover:text-white">Điều khoản dịch vụ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout

