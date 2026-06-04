import { Link } from 'react-router-dom'

import { usePageMeta } from '../shared/hooks/usePageMeta'

const stats = [
  { value: '2026', label: 'Dong san pham moi' },
  { value: '30 ngay', label: 'Ho tro doi tra' },
  { value: '24/7', label: 'Cham soc khach hang' },
]

const values = [
  {
    title: 'Phom dang gon gang',
    description: 'Moi thiet ke uu tien su vua van, de mac hang ngay va phu hop voi nhieu dang nguoi.',
  },
  {
    title: 'Chat lieu thuc dung',
    description: 'Tap trung vao vai thoang, ben mau, de bao quan va giu duoc do lich su trong thoi gian dai.',
  },
  {
    title: 'Trai nghiem ro rang',
    description: 'Thong tin san pham, size, mau sac va giao hang duoc trinh bay minh bach de khach mua nhanh hon.',
  },
]

const processSteps = [
  'Chon chat lieu va mau sac phu hop khi hau Viet Nam.',
  'Kiem tra phom, duong may va do co gian truoc khi len ke.',
  'Dong goi gon gang, ho tro doi tra khi san pham chua vua y.',
]

function About() {
  usePageMeta({
    title: 'Ve chung toi | PoloMan',
    description: 'PoloMan la thuong hieu thoi trang nam toi gian, lich su va de mac moi ngay.',
    canonicalPath: '/about',
  })

  return (
    <div className="space-y-10 pb-8 sm:space-y-12 lg:space-y-14">
      <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-10">
        <img
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1800&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,250,244,0.96)_0%,rgba(246,250,244,0.86)_45%,rgba(246,250,244,0.28)_100%)]" />
        <div className="relative mx-auto flex min-h-[480px] max-w-[1500px] items-center px-4 py-14 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <nav className="mb-6 text-sm text-emerald-900/55">
              <Link to="/" className="hover:text-emerald-900">
                Trang chu
              </Link>
              <span className="mx-2">/</span>
              <span className="text-emerald-950">Ve chung toi</span>
            </nav>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700/70">
              PoloMan Store
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-tight text-emerald-950 sm:text-5xl lg:text-7xl">
              Lich su hon trong tung ngay mac
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-emerald-950/70 sm:text-base">
              PoloMan theo duoi nhung mon do nam toi gian, de phoi va giu phong thai gon gang tu cong viec den cuoc hen cuoi ngay.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-800 px-6 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
              >
                Xem san pham
              </Link>
              <Link
                to="/collections"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-emerald-800/30 bg-white/75 px-6 text-sm font-black uppercase tracking-[0.12em] text-emerald-900 hover:bg-white"
              >
                Xem bo suu tap
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-black text-emerald-900">{item.value}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-900/60">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1200&auto=format&fit=crop"
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm sm:p-6 lg:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">Cau chuyen</p>
          <h2 className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            Chon it hon, mac tot hon
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-emerald-900/70">
            <p>
              PoloMan bat dau tu nhu cau rat don gian: nam gioi can nhung mon do lich su, de chon size va khong mat nhieu thoi gian phoi do moi sang.
            </p>
            <p>
              Thay vi chay theo qua nhieu xu huong, chung toi tap trung vao ao polo, so mi, quan va phu kien co phom on dinh, mau sac de ung dung va chat lieu dang tin cay.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">Gia tri</p>
          <h2 className="mt-2 text-2xl font-black text-emerald-950">Dieu PoloMan uu tien</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((item) => (
            <article key={item.title} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-emerald-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-emerald-900/65">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-emerald-100 bg-emerald-900 p-5 text-white shadow-sm sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Quy trinh</p>
          <h2 className="mt-3 text-2xl font-black">Tu san pham den don hang</h2>
        </div>
        <div className="grid gap-3">
          {processSteps.map((step, index) => (
            <div key={step} className="flex gap-4 rounded-xl border border-white/10 bg-white/8 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-900">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-white/75">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default About
