function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-6 px-4 text-center">
      <div className="relative">
        <h1 className="text-7xl font-black tracking-[0.12em] text-slate-800 sm:text-9xl sm:tracking-widest">404</h1>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded bg-emerald-500 px-2 text-xs font-extrabold uppercase text-slate-950 sm:text-sm">
          Không tìm thấy trang
        </span>
      </div>
      <p className="max-w-md text-base text-slate-400 sm:text-lg">
        Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <a
        href="/"
        className="cursor-pointer rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02] hover:bg-emerald-400 active:scale-[0.98]"
      >
        Về trang chủ
      </a>
    </div>
  )
}

export default NotFound
