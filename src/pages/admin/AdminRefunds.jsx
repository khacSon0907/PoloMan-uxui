import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Eye,
  FileText,
  Filter,
  LockKeyhole,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

import {
  getRefundStatusBadgeClass,
  getRefundStatusDescription,
  getRefundStatusLabel,
  getRefundTypeLabel,
  normalizeRefundStatus,
  refundApi,
} from '../../features/refund'
import { formatCurrency } from '../../features/product'
import { getApiMessage } from '../../shared/api'

const REFUND_CURSOR_LIMIT = 20

const statusOptions = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'APPROVED', label: 'Đã duyệt trả hàng' },
  { value: 'EXCHANGE_APPROVED', label: 'Đã duyệt đổi size' },
  { value: 'RETURN_RECEIVED', label: 'Đã nhận hàng' },
  { value: 'REFUND_REQUIRED', label: 'Cần hoàn tiền' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SUCCESS', label: 'Hoàn tất' },
  { value: 'EXCHANGED', label: 'Đã đổi size' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'FAILED', label: 'Thất bại' },
]

function formatDateOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatTimeOnly(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getRefundId(refund, index = 0) {
  return refund?.id || refund?._id || refund?.refundId || `RMA-${refund?.orderId || index}`
}

function getUserName(refund) {
  return refund?.username || refund?.userName || refund?.customerName || refund?.accountName || refund?.userId || '-'
}

function getProvider(refund) {
  return refund?.provider || refund?.paymentProvider || refund?.providerResponseMessage || '-'
}

function getPaymentBadge(refund) {
  return String(refund?.paymentMethod || refund?.provider || '').toUpperCase().includes('PAYOS') ? 'PAYOS' : 'COD'
}

function isSameOrAfter(value, start) {
  if (!start) return true
  const date = new Date(value)
  const startDate = new Date(start)
  return !Number.isNaN(date.getTime()) && date >= startDate
}

function isSameOrBefore(value, end) {
  if (!end) return true
  const date = new Date(value)
  const endDate = new Date(end)
  endDate.setHours(23, 59, 59, 999)
  return !Number.isNaN(date.getTime()) && date <= endDate
}

function StatCard({ icon: Icon, label, value, caption, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-50 text-slate-700',
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,76,58,0.06)]">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div>
          <p className={`text-sm font-black ${tones[tone].split(' ').at(-1)}`}>{label}</p>
          <p className="mt-1 text-2xl font-black text-neutral-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-neutral-500">{caption}</p>
        </div>
      </div>
    </div>
  )
}

function AdminRefunds() {
  const [refunds, setRefunds] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionModal, setActionModal] = useState(null)
  const [actionForm, setActionForm] = useState({ note: '', reason: '' })
  const [nextCursor, setNextCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [cursorLimit, setCursorLimit] = useState(REFUND_CURSOR_LIMIT)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const filteredRefunds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return [...refunds]
      .sort((a, b) => new Date(b?.requestedAt || 0).getTime() - new Date(a?.requestedAt || 0).getTime())
      .filter((refund, index) => {
        const status = normalizeRefundStatus(refund?.status)
        const requestedAt = refund?.requestedAt || refund?.createdAt
        const haystack = [
          getRefundId(refund, index),
          refund?.orderId,
          refund?.userId,
          getUserName(refund),
          getProvider(refund),
          refund?.reason,
          refund?.productId,
          refund?.productName,
          refund?.colorName,
          refund?.currentSizeName,
          refund?.requestedSizeName,
          refund?.bankCode,
          refund?.bankName,
          refund?.accountNumber,
          refund?.accountName,
          refund?.transferContent,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return (
          (statusFilter === 'ALL' || status === statusFilter) &&
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          isSameOrAfter(requestedAt, dateFrom) &&
          isSameOrBefore(requestedAt, dateTo)
        )
      })
  }, [dateFrom, dateTo, query, refunds, statusFilter])

  const stats = useMemo(() => {
    const countBy = (matcher) => refunds.filter((refund) => matcher(normalizeRefundStatus(refund?.status))).length
    return {
      total: refunds.length,
      pending: countBy((status) => status === 'PENDING'),
      approved: countBy((status) => ['APPROVED', 'EXCHANGE_APPROVED'].includes(status)),
      processing: countBy((status) => ['RETURN_RECEIVED', 'REFUND_REQUIRED', 'PROCESSING'].includes(status)),
      rejected: countBy((status) => ['REJECTED', 'FAILED'].includes(status)),
      completed: countBy((status) => ['SUCCESS', 'EXCHANGED'].includes(status)),
    }
  }, [refunds])

  const loadRefunds = async ({ cursor = null, append = false } = {}) => {
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)
    setErrorMessage('')

    try {
      const pageData = await refundApi.getAdminRefundsCursor({
        limit: REFUND_CURSOR_LIMIT,
        cursor,
      })

      setRefunds((current) => (append ? [...current, ...pageData.items] : pageData.items))
      setNextCursor(pageData.nextCursor)
      setHasNext(pageData.hasNext)
      setCursorLimit(pageData.limit)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể tải danh sách yêu cầu trả hàng / hoàn tiền.'))
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    refundApi
      .getAdminRefundsCursor({ limit: REFUND_CURSOR_LIMIT })
      .then((pageData) => {
        if (!isMounted) return
        setRefunds(pageData.items)
        setNextCursor(pageData.nextCursor)
        setHasNext(pageData.hasNext)
        setCursorLimit(pageData.limit)
      })
      .catch((error) => { if (isMounted) setErrorMessage(getApiMessage(error, 'Không thể tải danh sách yêu cầu trả hàng / hoàn tiền.')) })
      .finally(() => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [])

  const openActionModal = (type, refund) => {
    const defaults = {
      approve: 'Yêu cầu hợp lệ, khách vui lòng gửi hàng về shop',
      markReceived: 'Shop đã nhận hàng trả về, sản phẩm đúng với yêu cầu',
      markRefunded: 'Đã chuyển khoản hoàn tiền cho khách',
      reject: 'Admin ghi chú',
    }

    setActionModal({ type, refund })
    setActionForm({
      note: defaults[type] || '',
      reason: type === 'reject' ? 'Sản phẩm không đúng điều kiện trả hàng' : '',
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const closeActionModal = () => {
    if (isSubmitting) return
    setActionModal(null)
    setActionForm({ note: '', reason: '' })
  }

  const handleActionSubmit = async (event) => {
    event.preventDefault()
    if (!actionModal?.refund) return

    const id = getRefundId(actionModal.refund)
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (actionModal.type === 'approve') {
        await refundApi.approveRefund(id, { note: actionForm.note.trim() })
      } else if (actionModal.type === 'markReceived') {
        await refundApi.markReceived(id, { note: actionForm.note.trim() })
      } else if (actionModal.type === 'markRefunded') {
        await refundApi.markRefunded(id, { note: actionForm.note.trim() })
      } else {
        await refundApi.rejectRefund(id, { reason: actionForm.reason.trim(), note: actionForm.note.trim() })
      }

      setSuccessMessage('Đã cập nhật yêu cầu thành công.')
      setActionModal(null)
      setActionForm({ note: '', reason: '' })
      await loadRefunds()
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể cập nhật yêu cầu.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async (value, label) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setSuccessMessage(`Đã copy ${label}.`)
    } catch {
      setErrorMessage(`Không thể copy ${label}.`)
    }
  }

  const resetFilters = () => {
    setQuery('')
    setStatusFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const loadMoreRefunds = () => {
    if (!hasNext || !nextCursor || isLoadingMore) return
    loadRefunds({ cursor: nextCursor, append: true })
  }

  const renderActionButtons = (refund) => {
    const status = normalizeRefundStatus(refund?.status)
    if (status === 'PENDING') {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => openActionModal('approve', refund)} className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700">
            Duyệt
          </button>
          <button type="button" onClick={() => openActionModal('reject', refund)} className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 hover:bg-red-100">
            Từ chối
          </button>
        </div>
      )
    }
    if (['APPROVED', 'EXCHANGE_APPROVED'].includes(status)) {
      return (
        <button type="button" onClick={() => openActionModal('markReceived', refund)} className="h-9 rounded-xl bg-sky-600 px-3 text-xs font-black text-white hover:bg-sky-700">
          Đã nhận hàng
        </button>
      )
    }
    if (['REFUND_REQUIRED', 'RETURN_RECEIVED', 'PROCESSING'].includes(status)) {
      return (
        <button type="button" onClick={() => openActionModal('markRefunded', refund)} className="h-9 rounded-xl bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-700">
          Đã hoàn tiền
        </button>
      )
    }
    return <span className="text-sm font-semibold text-neutral-400">-</span>
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-3xl font-black tracking-tight text-neutral-950">Trả hàng / Hoàn tiền</h1>
        <p className="mt-2 text-sm font-medium text-neutral-500">Quản lý yêu cầu trả hàng và hoàn tiền từ khách hàng.</p>
      </section>

      <section className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_10px_30px_rgba(15,76,58,0.05)]">
        <div className="grid gap-3 xl:grid-cols-[260px_minmax(320px,1fr)_190px_190px_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo mã yêu cầu, order, user, provider..."
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm text-neutral-700 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm text-neutral-700 outline-none focus:border-emerald-500"
            />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-black text-neutral-700 hover:border-emerald-400 hover:text-emerald-700"
          >
            Bộ lọc
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Boxes} label="Tất cả yêu cầu" value={stats.total} caption="Tổng số yêu cầu" tone="emerald" />
        <StatCard icon={LockKeyhole} label="Chờ xử lý" value={stats.pending} caption="Đang chờ xem xét" tone="blue" />
        <StatCard icon={PackageCheck} label="Đã duyệt" value={stats.approved} caption="Chờ khách gửi hàng" tone="amber" />
        <StatCard icon={ClipboardCheck} label="Đang xử lý" value={stats.processing} caption="Đang hoàn tiền" tone="violet" />
        <StatCard icon={ShieldAlert} label="Từ chối" value={stats.rejected} caption="Đã từ chối" tone="red" />
        <StatCard icon={CheckCircle2} label="Hoàn tất" value={stats.completed} caption="Đã hoàn tiền" tone="slate" />
      </section>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{errorMessage}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_16px_45px_rgba(15,76,58,0.07)]">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : filteredRefunds.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left">
                <thead className="border-b border-neutral-100 bg-neutral-50/80 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4">Mã yêu cầu</th>
                    <th className="px-5 py-4">Đơn hàng / Sản phẩm</th>
                    <th className="px-5 py-4">Số tiền</th>
                    <th className="px-5 py-4">Lý do</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Ngày tạo</th>
                    <th className="px-5 py-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRefunds.map((refund, index) => {
                    const refundId = getRefundId(refund, index)
                    const images = Array.isArray(refund.imageUrls) ? refund.imageUrls : []
                    return (
                      <tr key={refundId} className="bg-white align-top transition-colors hover:bg-emerald-50/20">
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-neutral-950">#{refundId}</span>
                            <button type="button" onClick={() => copyToClipboard(refundId, 'mã yêu cầu')} className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-emerald-700 hover:bg-emerald-50" aria-label="Copy mã yêu cầu">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            {getRefundTypeLabel(refund.type)}
                          </span>
                          <p className="mt-3 text-sm font-medium text-neutral-500">Yêu cầu bởi: <span className="font-black text-neutral-700">{getUserName(refund)}</span></p>
                        </td>
                        <td className="px-5 py-5 text-sm leading-6">
                          <p><span className="font-black text-neutral-950">Order:</span> <span className="font-semibold text-emerald-700">{refund.orderId || '-'}</span></p>
                          <p><span className="font-black text-neutral-950">User:</span> <span className="font-semibold text-emerald-700">{refund.userId || getUserName(refund)}</span></p>
                          <p><span className="font-black text-neutral-950">Product:</span> <span className="font-semibold text-neutral-800">{refund.productName || '-'}</span></p>
                          {refund.productId && <p><span className="font-black text-neutral-950">Product ID:</span> <span className="font-semibold text-neutral-500">{refund.productId}</span></p>}
                          {refund.colorName && <p><span className="font-black text-neutral-950">Color:</span> {refund.colorName}</p>}
                          <p>
                            <span className="font-black text-neutral-950">Size:</span> {refund.currentSizeName || '-'}
                            {refund.requestedSizeName ? <span className="font-black text-emerald-700"> -&gt; {refund.requestedSizeName}</span> : ''}
                          </p>
                        </td>
                        <td className="px-5 py-5">
                          <p className="text-base font-black text-emerald-700">{formatCurrency(refund.refundAmount)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${getPaymentBadge(refund) === 'PAYOS' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {getPaymentBadge(refund)}
                          </span>
                        </td>
                        <td className="px-5 py-5 max-w-72 text-sm font-semibold leading-6 text-neutral-700">
                          <p className="line-clamp-3">{refund.reason || '-'}</p>
                          {images.length > 0 ? (
                            <div className="mt-3 flex gap-2">
                              {images.slice(0, 3).map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="h-14 w-14 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50">
                                  <img src={url} alt="Ảnh bằng chứng" className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-neutral-400">-</p>
                          )}
                        </td>
                        <td className="px-5 py-5">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getRefundStatusBadgeClass(refund.status)}`}>
                            {getRefundStatusLabel(refund.status)}
                          </span>
                          <p className="mt-3 text-sm font-medium text-neutral-500">{getRefundStatusDescription(refund.status)}</p>
                        </td>
                        <td className="px-5 py-5 text-sm font-semibold text-neutral-600">
                          <p>{formatDateOnly(refund.requestedAt || refund.createdAt)}</p>
                          <p className="mt-1 text-neutral-400">{formatTimeOnly(refund.requestedAt || refund.createdAt)}</p>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/admin/refunds/${encodeURIComponent(refundId)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50">
                              <Eye className="h-4 w-4" />
                              Xem chi tiết
                            </Link>
                            <div className="group relative">
                              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50" aria-label="Mở hành động">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <div className="invisible absolute right-0 top-11 z-20 min-w-44 rounded-xl border border-neutral-100 bg-white p-2 text-right opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                                {renderActionButtons(refund)}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 text-sm font-medium text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
              <p>Đã tải {refunds.length} yêu cầu, đang hiển thị {filteredRefunds.length} yêu cầu phù hợp. Mỗi lần tải {cursorLimit} yêu cầu.</p>
              {hasNext && nextCursor && (
                <button
                  type="button"
                  onClick={loadMoreRefunds}
                  disabled={isLoadingMore}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load more
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <FileText className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-4 text-base font-black text-neutral-950">Không có yêu cầu phù hợp</h3>
            <p className="mt-2 text-sm font-medium text-neutral-500">Thử đổi bộ lọc hoặc tải lại danh sách.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => loadRefunds()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700">
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
              {hasNext && nextCursor && (
                <button type="button" onClick={loadMoreRefunds} disabled={isLoadingMore} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                  <ChevronDown className="h-4 w-4" />
                  Load more
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={handleActionSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Xác nhận thao tác</p>
            <h2 className="mt-2 text-2xl font-black text-neutral-950">#{getRefundId(actionModal.refund)}</h2>
            <p className="mt-2 text-sm font-medium text-neutral-500">Đơn hàng #{actionModal.refund?.orderId || '-'} - {formatCurrency(actionModal.refund?.refundAmount)}</p>

            {['markRefunded', 'markReceived'].includes(actionModal.type) && (
              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold leading-7 text-neutral-700">
                <p><span className="font-black text-neutral-950">Số tiền:</span> {formatCurrency(actionModal.refund?.refundAmount)}</p>
                <p><span className="font-black text-neutral-950">Ngân hàng:</span> {actionModal.refund?.bankName || '-'} {actionModal.refund?.bankCode ? `- ${actionModal.refund.bankCode}` : ''}</p>
                <p><span className="font-black text-neutral-950">Số tài khoản:</span> {actionModal.refund?.accountNumber || '-'}</p>
                <p><span className="font-black text-neutral-950">Chủ tài khoản:</span> {actionModal.refund?.accountName || '-'}</p>
                <p><span className="font-black text-neutral-950">Nội dung chuyển khoản:</span> {actionModal.refund?.transferContent || '-'}</p>
              </div>
            )}

            {actionModal.type === 'reject' && (
              <label className="mt-5 grid gap-2">
                <span className="text-sm font-bold text-neutral-800">Lý do từ chối</span>
                <textarea value={actionForm.reason} onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))} rows={3} disabled={isSubmitting} className="resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600" />
              </label>
            )}

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-neutral-800">Ghi chú admin</span>
              <textarea value={actionForm.note} onChange={(event) => setActionForm((current) => ({ ...current, note: event.target.value }))} rows={3} disabled={isSubmitting} className="resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-600" />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeActionModal} disabled={isSubmitting} className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-600 hover:border-emerald-500 disabled:opacity-60">
                Hủy
              </button>
              <button type="submit" disabled={isSubmitting} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
                {actionModal.type === 'reject' ? <XCircle className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminRefunds
