function AdminPlaceholder({ title }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Admin
      </p>
      <h2 className="mt-2 text-xl font-semibold text-neutral-950 sm:text-2xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
        Man hinh nay da duoc gan vao admin layout. Ban co the noi API va bang du lieu that
        cho module nay o buoc tiep theo.
      </p>
    </section>
  )
}

export default AdminPlaceholder
