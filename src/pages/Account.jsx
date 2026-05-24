import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { tokenStorage } from '../shared/api'

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tài khoản'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

const orders = [
  {
    id: 'PM240501',
    date: '18/05/2026',
    status: 'Đang giao',
    total: 1240000,
    items: 'Áo Polo Premium, Quần Khaki Slim-fit',
  },
  {
    id: 'PM240422',
    date: '02/05/2026',
    status: 'Hoàn thành',
    total: 690000,
    items: 'Áo Sơ Mi Oxford',
  },
  {
    id: 'PM240318',
    date: '16/04/2026',
    status: 'Hoàn thành',
    total: 980000,
    items: 'Áo Polo Essential, Thắt lưng da',
  },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function Account() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'profile'
  const user = authSnapshot.user

  const profileFields = useMemo(() => [
    { label: 'Tên hiển thị', value: getDisplayName(user) },
    { label: 'Email', value: user?.email || 'Chưa cập nhật' },
    { label: 'Mã tài khoản', value: user?.id || 'Chưa cập nhật' },
    { label: 'Vai trò', value: user?.roles?.length ? user.roles.join(', ') : 'Khách hàng' },
  ], [user])

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="py-8">
      <div className="mb-8 flex flex-col gap-5 border-b border-neutral-200 pb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-xl font-semibold text-neutral-900">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitial(user)
            )}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">Tài khoản của tôi</p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-950">{getDisplayName(user)}</h1>
            {user?.email && (
              <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
            )}
          </div>
        </div>

        <div className="inline-flex w-full rounded-lg border border-neutral-200 bg-neutral-50 p-1 md:w-auto">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'profile' })}
            className={`h-10 flex-1 rounded-md px-4 text-sm font-semibold transition-colors md:flex-none ${
              activeTab === 'profile'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'orders' })}
            className={`h-10 flex-1 rounded-md px-4 text-sm font-semibold transition-colors md:flex-none ${
              activeTab === 'orders'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Lịch sử order
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <section className="max-w-3xl">
          <h2 className="text-lg font-semibold text-neutral-950">Thông tin cá nhân</h2>
          <div className="mt-5 divide-y divide-neutral-100 border-y border-neutral-200">
            {profileFields.map((field) => (
              <div key={field.label} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
                <p className="text-sm font-medium text-neutral-500">{field.label}</p>
                <p className="text-sm text-neutral-950">{field.value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold text-neutral-950">Lịch sử order</h2>
          <div className="mt-5 overflow-hidden border-y border-neutral-200">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-4 border-b border-neutral-100 py-5 last:border-b-0 lg:grid-cols-[150px_1fr_140px_160px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">#{order.id}</p>
                  <p className="mt-1 text-xs text-neutral-500">{order.date}</p>
                </div>
                <p className="text-sm text-neutral-700">{order.items}</p>
                <span className="w-fit rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {order.status}
                </span>
                <p className="text-sm font-semibold text-neutral-950 lg:text-right">
                  {formatCurrency(order.total)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Account
