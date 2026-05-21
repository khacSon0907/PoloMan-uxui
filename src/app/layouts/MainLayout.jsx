import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../../components/ui/Header'

function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-neutral-900 font-sans antialiased">
      <Header />

      <main className="flex-grow max-w-[1500px] w-full mx-auto px-6 lg:px-10 py-8">
        {children || <Outlet />}
      </main>

      <footer className="bg-neutral-50 border-t border-neutral-200 text-neutral-600 text-sm mt-auto">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-neutral-950">
              PoloMan Store
            </h3>
            <p className="text-sm leading-relaxed text-neutral-500">
              Thương hiệu thời trang nam tối giản cao cấp. Chúng tôi tập trung vào chất liệu tuyển chọn và các đường may tinh tế để mang lại sự tự tin lịch lãm nhất cho phái mạnh.
            </p>

            <div className="space-y-2 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-neutral-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>123 Đường 3/2, Quận 10, TP. Hồ Chí Minh</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-neutral-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Hotline: 1900 6789</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="/faq" className="hover:text-black transition-colors">Câu hỏi thường gặp</a></li>
              <li><a href="/shipping" className="hover:text-black transition-colors">Chính sách vận chuyển</a></li>
              <li><a href="/returns" className="hover:text-black transition-colors">Chính sách đổi trả 30 ngày</a></li>
              <li><a href="/size-guide" className="hover:text-black transition-colors">Hướng dẫn chọn size</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Danh mục sản phẩm
            </h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="/category/polo" className="hover:text-black transition-colors">Áo Polo Cao Cấp</a></li>
              <li><a href="/category/shirts" className="hover:text-black transition-colors">Áo Sơ Mi Lịch Lãm</a></li>
              <li><a href="/category/trousers" className="hover:text-black transition-colors">Quần Tây / Quần Khaki</a></li>
              <li><a href="/category/accessories" className="hover:text-black transition-colors">Phụ kiện nam giới</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Đăng ký nhận ưu đãi
            </h4>
            <p className="text-sm text-neutral-500">
              Nhận thông báo bộ sưu tập mới và ưu đãi đặc quyền sớm nhất từ PoloMan.
            </p>

            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email của bạn..."
                className="flex-grow h-10 px-3 rounded bg-white border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-black transition-all"
              />
              <button className="h-10 px-5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all cursor-pointer">
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-100 py-6 text-center text-sm text-neutral-500">
          <div className="max-w-[1500px] mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} PoloMan. Tất cả bản quyền được bảo lưu.</p>

            <div className="flex items-center gap-4 text-neutral-400">
              <a href="/privacy" className="hover:text-black">Chính sách bảo mật</a>
              <span>•</span>
              <a href="/terms" className="hover:text-black">Điều khoản dịch vụ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout