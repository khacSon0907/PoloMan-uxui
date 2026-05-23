function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
      <div className="relative">
        <h1 className="text-9xl font-black tracking-widest text-slate-800">404</h1>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-emerald-500 text-slate-950 text-sm font-extrabold uppercase rounded rotate-12">
          Không tìm thấy trang
        </span>
      </div>
      <p className="text-slate-400 text-lg max-w-md">
        Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <a
        href="/"
        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm"
      >
        Về trang chủ
      </a>
    </div>
  )
}

export default NotFound
