import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Headphones, Heart, KeyRound, LogOut, MapPin, Package, RefreshCw, UserRound } from 'lucide-react'

import { refundApi, getRefundStatusBadgeClass, getRefundStatusLabel, getRefundTypeLabel } from '../features/refund'
import { formatCurrency } from '../features/product'
import { getApiMessage, tokenStorage } from '../shared/api'

const sidebarItems = [
  { label: 'Thong tin tai khoan', icon: UserRound, to: '/account' },
  { label: 'Dia chi cua toi', icon: MapPin, to: '/account/addresses/new' },
  { label: 'Don hang cua toi', icon: Package, to: '/account/orders' },
  { label: 'San pham yeu thich', icon: Heart, to: '/favorites' },
  { label: 'Yêu cầu trả/đổi hàng', icon: RefreshCw, to: '/account/refunds', active: true },
  { label: 'Doi mat khau', icon: KeyRound, to: '/change-password' },
]

function getDisplayName(user) {
  return user?.fullName || user?.username || user?.name || user?.email || 'Tai khoan'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getRefundId(refund, index) {
  return refund?.id || refund?._id || refund?.refundId || `${refund?.orderId || 'refund'}-${index}`
}

function AccountRefunds() {
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [refunds, setRefunds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const user = authSnapshot.user

  const sortedRefunds = useMemo(
    () => [...refunds].sort((a, b) => new Date(b?.requestedAt || 0).getTime() - new Date(a?.requestedAt || 0).getTime()),
    [refunds],
  )

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  const loadRefunds = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const list = await refundApi.getMyRefunds()
      setRefunds(list)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể tải danh sách yêu cầu trả/đổi hàng.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    if (authSnapshot.isInitializing) return () => { isMounted = false }

    if (!authSnapshot.isAuthenticated) {
      Promise.resolve().then(() => { if (isMounted) setIsLoading(false) })
      return () => { isMounted = false }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
    })

    refundApi
      .getMyRefunds()
      .then((list) => { if (isMounted) setRefunds(list) })
      .catch((error) => { if (isMounted) setErrorMessage(getApiMessage(error, 'Không thể tải danh sách yêu cầu trả/đổi hàng.')) })
      .finally(() => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [authSnapshot.isAuthenticated, authSnapshot.isInitializing])

  const handleLogout = () => {
    tokenStorage.clear()
    window.location.href = '/login'
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-neutral-100 bg-white shadow-[0_8px_30px_rgba(2,44,34,0.07)]">
        <div className="flex items-center gap-4 border-b border-neutral-100 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-600">Xin chao,</p>
            <p className="mt-0.5 truncate text-base font-black text-emerald-950">{getDisplayName(user)}</p>
          </div>
        </div>

        <nav className="p-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  item.active ? 'bg-emerald-800 text-white' : 'text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            Dang xuat
          </button>
        </nav>

        <div className="m-4 rounded-2xl bg-emerald-50 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-800 text-white">
            <Headphones className="h-6 w-6" />
          </div>
          <p className="mt-3 font-black text-emerald-950">Can ho tro?</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">Doi ngu PoloMan luon san sang ho tro ban.</p>
        </div>
      </aside>

      <main>
        <nav className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
          <Link to="/" className="hover:text-emerald-700">Trang chu</Link>
          <span>/</span>
          <Link to="/account" className="hover:text-emerald-700">Tai khoan</Link>
          <span>/</span>
          <span className="font-semibold text-emerald-800">Yêu cầu trả/đổi hàng</span>
        </nav>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-emerald-950">Yêu cầu trả/đổi hàng của tôi</h1>
            <p className="mt-1 text-sm text-emerald-900/60">Theo dõi trạng thái trả hàng, đổi size và hoàn tiền thủ công.</p>
          </div>
          <button
            type="button"
            onClick={loadRefunds}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Tai lai
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
          </div>
        ) : sortedRefunds.length ? (
          <div className="space-y-4">
            {sortedRefunds.map((refund, index) => (
              <article key={getRefundId(refund, index)} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,76,58,0.05)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-emerald-950">{getRefundTypeLabel(refund.type)} - đơn #{refund.orderId || '-'}</p>
                    <p className="mt-1 text-xs text-neutral-500">Gửi lúc {formatDate(refund.requestedAt)}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.1em] ${getRefundStatusBadgeClass(refund.status)}`}>
                    {getRefundStatusLabel(refund.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-emerald-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">So tien</p>
                    <p className="mt-2 text-lg font-black text-emerald-950">{formatCurrency(refund.refundAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">Sản phẩm / size</p>
                    <p className="mt-2 text-sm font-black text-neutral-950">{refund.productName || '-'}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-700">
                      {refund.currentSizeName || '-'} {refund.requestedSizeName ? `→ ${refund.requestedSizeName}` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl bg-sky-50 p-4 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700/70">Tai khoan nhan tien</p>
                    <p className="mt-2 text-sm font-black text-neutral-950">
                      {refund.bankName || '-'} {refund.bankCode ? `(${refund.bankCode})` : ''}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-700">
                      {refund.accountNumber || '-'} - {refund.accountName || '-'}
                    </p>
                    {refund.transferContent && (
                      <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-sky-700">
                        Noi dung CK: {refund.transferContent}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">Ly do</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-neutral-800">{refund.reason || '-'}</p>
                  </div>
                </div>

                {Array.isArray(refund.imageUrls) && refund.imageUrls.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {refund.imageUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="h-20 w-20 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                        <img src={url} alt="Ảnh bằng chứng" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                  <p><span className="font-bold text-neutral-950">Phản hồi:</span> {refund.providerResponseMessage || refund.adminNote || '-'}</p>
                  <p><span className="font-bold text-neutral-950">Lý do từ chối:</span> {refund.rejectedReason || '-'}</p>
                  <p><span className="font-bold text-neutral-950">Duyệt lúc:</span> {formatDate(refund.approvedAt)}</p>
                  <p><span className="font-bold text-neutral-950">Nhận hàng lúc:</span> {formatDate(refund.receivedAt)}</p>
                  <p><span className="font-bold text-neutral-950">Xử lý lúc:</span> {formatDate(refund.processedAt)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-400 shadow-sm">
              <RefreshCw className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-black text-emerald-950">Bạn chưa có yêu cầu trả/đổi hàng nào</p>
            <p className="mt-1 text-sm text-emerald-700/60">Các yêu cầu trả hàng, đổi size và hoàn tiền sẽ hiển thị tại đây.</p>
            <Link to="/account/orders" className="mt-5 inline-flex h-10 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900">
              Xem don hang
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default AccountRefunds
