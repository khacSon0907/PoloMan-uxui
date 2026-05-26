import { useMemo } from 'react'

import { normalizeRoles, tokenStorage } from '../../shared/api'

const metrics = [
  { label: 'Doanh thu hom nay', value: '12.4M', caption: '+8.2% so voi hom qua' },
  { label: 'Don hang moi', value: '34', caption: '7 don dang cho xu ly' },
  { label: 'San pham dang ban', value: '128', caption: '12 san pham sap het hang' },
  { label: 'Khach hang', value: '2,846', caption: '146 tai khoan moi trong thang' },
]

const recentOrders = [
  { id: 'PM26052501', customer: 'Nguyen Minh', status: 'Cho xac nhan', total: '1.240.000 VND' },
  { id: 'PM26052502', customer: 'Tran Bao', status: 'Dang giao', total: '690.000 VND' },
  { id: 'PM26052503', customer: 'Le Hoang', status: 'Hoan thanh', total: '980.000 VND' },
]

function AdminDashboard() {
  const user = tokenStorage.getUser()
  const roles = useMemo(() => normalizeRoles(user?.roles || user?.role), [user])

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Xin chao
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold text-neutral-950 sm:text-2xl">
              {user?.username || user?.email || 'Admin'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Khu vuc quan tri danh cho tai khoan co role ADMIN. Tai khoan admin van co the
              quay lai website chinh bang nut Website.
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 md:min-w-52">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Roles</p>
            <p className="mt-1 text-sm font-semibold text-neutral-950">
              {roles.length ? roles.join(', ') : 'Chua co role'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950">{metric.value}</p>
            <p className="mt-2 text-xs text-neutral-400">{metric.caption}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-950">Don hang gan day</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="grid gap-3 px-4 py-4 text-sm sm:px-5 lg:grid-cols-[150px_1fr_140px_150px] lg:items-center"
            >
              <p className="font-semibold text-neutral-950">#{order.id}</p>
              <p className="text-neutral-600">{order.customer}</p>
              <span className="w-fit rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600">
                {order.status}
              </span>
              <p className="font-semibold text-neutral-950 lg:text-right">{order.total}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
