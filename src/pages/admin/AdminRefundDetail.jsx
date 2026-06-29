import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Banknote,
  CalendarDays,
  Copy,
  Download,
  ExternalLink,
  FileText,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  X,
  XCircle,
  ZoomIn,
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

function formatDateTime(value) {
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

function getRefundId(refund) {
  return refund?.id || refund?._id || refund?.refundId || ''
}

function getShortRefundId(refund) {
  const rawId = String(getRefundId(refund) || refund?.orderId || '')
  if (rawId.startsWith('RF-')) return rawId

  const requestedAt = refund?.requestedAt || refund?.createdAt
  const date = requestedAt && !Number.isNaN(new Date(requestedAt).getTime())
    ? new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(requestedAt)).replaceAll('-', '')
    : 'REFUND'
  return `RF-${date}${rawId.slice(-6).toUpperCase()}`
}

function getUserName(refund) {
  return refund?.username || refund?.userName || refund?.customerName || refund?.accountName || refund?.userId || '-'
}

function getPaymentBadge(refund) {
  return String(refund?.paymentMethod || refund?.provider || '').toUpperCase().includes('PAYOS') ? 'PAYOS' : 'COD'
}

function getProductImage(refund) {
  return refund?.productImageUrl || refund?.productImage || refund?.thumbnailUrl || refund?.imageUrl || refund?.imageUrls?.[0] || ''
}

function getStatusDotClass(status) {
  const normalizedStatus = normalizeRefundStatus(status)
  if (['SUCCESS', 'EXCHANGED'].includes(normalizedStatus)) return 'bg-emerald-500'
  if (normalizedStatus === 'PENDING') return 'bg-amber-500'
  if (['REJECTED', 'FAILED'].includes(normalizedStatus)) return 'bg-red-500'
  if (['APPROVED', 'EXCHANGE_APPROVED'].includes(normalizedStatus)) return 'bg-sky-500'
  return 'bg-violet-500'
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${getRefundStatusBadgeClass(status)}`}>
      <span className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`} />
      {getRefundStatusLabel(status)}
    </span>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
      <p className="font-semibold text-neutral-600">{label}</p>
      <div className="break-words font-black text-neutral-950">{children || '-'}</div>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <h2 className="text-base font-black text-neutral-950">{children}</h2>
    </div>
  )
}

function RefundTimeline({ refund }) {
  const status = normalizeRefundStatus(refund?.status)
  const steps = [
    { key: 'created', label: 'Yêu cầu được tạo', date: refund?.requestedAt || refund?.createdAt, active: true, actor: 'Khách hàng' },
    {
      key: 'approved',
      label: status === 'REJECTED' ? 'Yêu cầu bị từ chối' : 'Yêu cầu được duyệt',
      date: refund?.approvedAt || refund?.rejectedAt || refund?.updatedAt,
      active: status !== 'PENDING',
      negative: ['REJECTED', 'FAILED'].includes(status),
      actor: 'Admin',
    },
    {
      key: 'received',
      label: 'Shop đã nhận hàng',
      date: refund?.receivedAt || refund?.updatedAt,
      active: ['RETURN_RECEIVED', 'REFUND_REQUIRED', 'PROCESSING', 'SUCCESS', 'EXCHANGED'].includes(status),
      actor: 'Admin',
    },
    {
      key: 'refunded',
      label: status === 'EXCHANGED' ? 'Đã đổi size' : 'Đã hoàn tiền',
      date: refund?.refundedAt || refund?.completedAt || refund?.updatedAt,
      active: ['SUCCESS', 'EXCHANGED'].includes(status),
      actor: 'Hệ thống',
    },
  ]

  return (
    <div>
      {steps.map((step, index) => (
        <div key={step.key} className="grid grid-cols-[18px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 rounded-full ${step.active ? (step.negative ? 'bg-red-500' : 'bg-emerald-500') : 'bg-neutral-300'}`} />
            {index < steps.length - 1 && <span className="h-10 w-px bg-neutral-200" />}
          </div>
          <div className={index < steps.length - 1 ? 'pb-4' : ''}>
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm font-black ${step.active ? 'text-neutral-950' : 'text-neutral-400'}`}>{step.label}</p>
              {step.active && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">{step.actor}</span>}
            </div>
            <p className="mt-1 text-xs font-semibold text-neutral-500">{step.active ? formatDateTime(step.date) : 'Đang chờ'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

async function findRefundFromCursor(refundId) {
  let cursor = null
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const page = await refundApi.getAdminRefundsCursor({ limit: 50, cursor })
    const found = page.items.find((refund) => [refund?.id, refund?._id, refund?.refundId].map(String).includes(String(refundId)))
    if (found || !page.hasNext || !page.nextCursor) return found || null
    cursor = page.nextCursor
  }
  return null
}

function AdminRefundDetail() {
  const { refundId } = useParams()
  const navigate = useNavigate()
  const [refund, setRefund] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [actionForm, setActionForm] = useState({ note: '', reason: '' })
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadRefund = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      let data = null
      try {
        data = await refundApi.getAdminRefundById(refundId)
      } catch {
        data = await findRefundFromCursor(refundId)
      }
      if (!data) throw new Error('Không tìm thấy yêu cầu hoàn tiền.')
      setRefund(data)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể tải chi tiết yêu cầu hoàn tiền.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadRefund())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundId])

  useEffect(() => {
    if (!previewImage) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPreviewImage(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewImage])

  const copyToClipboard = async (value, label) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setSuccessMessage(`Đã copy ${label}.`)
    } catch {
      setErrorMessage(`Không thể copy ${label}.`)
    }
  }

  const openActionModal = (type) => {
    const defaults = {
      approve: 'Yêu cầu hợp lệ, khách vui lòng gửi hàng về shop',
      markReceived: 'Shop đã nhận hàng trả về, sản phẩm đúng với yêu cầu',
      markRefunded: 'Đã chuyển khoản hoàn tiền cho khách',
      reject: 'Admin ghi chú',
    }
    setActionModal({ type })
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
    if (!refund || !actionModal?.type) return

    const id = getRefundId(refund)
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
      await loadRefund()
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Không thể cập nhật yêu cầu.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderActionButtons = () => {
    const status = normalizeRefundStatus(refund?.status)
    if (status === 'PENDING') {
      return (
        <>
          <button type="button" onClick={() => openActionModal('reject')} className="h-12 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-600 hover:bg-red-100">
            Từ chối
          </button>
          <button type="button" onClick={() => openActionModal('approve')} className="h-12 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800">
            Duyệt yêu cầu
          </button>
        </>
      )
    }
    if (['APPROVED', 'EXCHANGE_APPROVED'].includes(status)) {
      return <button type="button" onClick={() => openActionModal('markReceived')} className="h-12 rounded-xl bg-sky-600 px-5 text-sm font-black text-white hover:bg-sky-700">Đã nhận hàng</button>
    }
    if (['REFUND_REQUIRED', 'RETURN_RECEIVED', 'PROCESSING'].includes(status)) {
      return <button type="button" onClick={() => openActionModal('markRefunded')} className="h-12 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700">Đã hoàn tiền</button>
    }
    return (
      <>
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 items-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-black text-neutral-800 hover:bg-neutral-50">
          <Download className="h-4 w-4" />
          Tải biên lai hoàn tiền
        </button>
        <button type="button" onClick={() => copyToClipboard(refund?.transferContent || getRefundId(refund), 'giao dịch')} className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800">
          <ExternalLink className="h-4 w-4" />
          Xem giao dịch ngân hàng
        </button>
      </>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/admin/refunds" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">← Quay lại danh sách hoàn tiền</Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">Chi tiết yêu cầu trả hàng / hoàn tiền</h1>
        </div>
        <button type="button" onClick={() => navigate(-1)} className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-black text-neutral-700 hover:bg-neutral-50">
          Quay lại
        </button>
      </div>

      {successMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{successMessage}</div>}
      {errorMessage && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{errorMessage}</div>}

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center rounded-2xl border border-neutral-100 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
        </div>
      ) : refund ? (
        <section className="overflow-hidden rounded-[22px] border border-neutral-100 bg-white shadow-[0_18px_50px_rgba(15,76,58,0.08)]">
          <div className="px-7 pb-5 pt-7 sm:px-9">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-500">Mã yêu cầu</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="break-all text-2xl font-black tracking-tight text-neutral-950">#{refund.orderId || getShortRefundId(refund)}</p>
                  <button type="button" onClick={() => copyToClipboard(getRefundId(refund), 'mã yêu cầu')} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Copy mã yêu cầu">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <StatusBadge status={refund.status} />
                  <p className="text-sm font-semibold text-neutral-500">{getRefundStatusDescription(refund.status) || getRefundTypeLabel(refund.type)}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-black text-neutral-800">Ngày tạo yêu cầu</p>
                      <p className="mt-1 text-sm font-black text-neutral-950">{formatDateTime(refund.requestedAt || refund.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><RefreshCw className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-black text-neutral-800">Cập nhật cuối cùng</p>
                      <p className="mt-1 text-sm font-black text-neutral-950">{formatDateTime(refund.updatedAt || refund.refundedAt || refund.completedAt || refund.requestedAt || refund.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-7 pb-7 sm:px-9 lg:grid-cols-[minmax(0,2fr)_minmax(340px,0.9fr)]">
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)]">
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <SectionTitle icon={PackageCheck}>Thông tin đơn hàng</SectionTitle>
                  <div className="mt-5 space-y-5">
                    <DetailRow label="Mã đơn hàng">#{refund.orderId || '-'}</DetailRow>
                    <DetailRow label="Khách hàng"><div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-black uppercase text-neutral-950">{getUserName(refund)}</div></DetailRow>
                    <DetailRow label="Sản phẩm">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                          {getProductImage(refund) ? <img src={getProductImage(refund)} alt={refund.productName || 'Sản phẩm'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-black text-neutral-400">IMG</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words font-black text-neutral-950">{refund.productName || '-'}</p>
                          <p className="mt-1 text-xs font-semibold text-neutral-500">Màu: {refund.colorName || '-'} · Size: {refund.currentSizeName || '-'}{refund.requestedSizeName ? ` -> ${refund.requestedSizeName}` : ''} · SL: {refund.quantity || refund.productQuantity || 1}</p>
                          {refund.productId && <p className="mt-1 break-all text-xs font-semibold text-neutral-400">ID: {refund.productId}</p>}
                        </div>
                      </div>
                    </DetailRow>
                    <DetailRow label="Phương thức thanh toán">{getPaymentBadge(refund)}</DetailRow>
                  </div>
                </section>
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <SectionTitle icon={ShieldAlert}>Lý do trả hàng</SectionTitle>
                  <div className="mt-5 space-y-5">
                    <DetailRow label="Lý do hoàn tiền"><div className="min-h-32 rounded-xl bg-emerald-50/60 px-4 py-4 font-semibold leading-7 text-neutral-800">{refund.reason || '-'}</div></DetailRow>
                    <DetailRow label="Ghi chú thêm"><div className="rounded-xl border border-dashed border-neutral-200 px-4 py-3 font-semibold text-neutral-400">{refund.adminNote || refund.note || 'Không có ghi chú'}</div></DetailRow>
                  </div>
                </section>
              </div>
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <SectionTitle icon={FileText}>Hình ảnh / Video chứng minh</SectionTitle>
                {Array.isArray(refund.imageUrls) && refund.imageUrls.length > 0 ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {refund.imageUrls.map((url, index) => (
                      <button key={url} type="button" onClick={() => setPreviewImage(url)} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-left">
                        <img src={url} alt={`Ảnh minh chứng ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/60 text-white"><ZoomIn className="h-4 w-4" /></span>
                      </button>
                    ))}
                  </div>
                ) : <div className="mt-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm font-semibold text-neutral-400">Chưa có ảnh minh chứng</div>}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
                <SectionTitle icon={Banknote}>Thông tin hoàn tiền</SectionTitle>
                <div className="mt-5 space-y-5">
                  <DetailRow label="Số tiền hoàn"><span className="text-2xl font-black text-emerald-700">{formatCurrency(refund.refundAmount)}</span></DetailRow>
                  <DetailRow label="Ngân hàng">{refund.bankName || '-'} {refund.bankCode ? `- ${refund.bankCode}` : ''}</DetailRow>
                  <DetailRow label="Số tài khoản">{refund.accountNumber || '-'}</DetailRow>
                  <DetailRow label="Tên chủ tài khoản">{refund.accountName || '-'}</DetailRow>
                  <DetailRow label="Nội dung CK">{refund.transferContent || '-'}</DetailRow>
                </div>
              </section>
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <SectionTitle icon={RefreshCw}>Lịch sử xử lý</SectionTitle>
                <div className="mt-5"><RefundTimeline refund={refund} /></div>
              </section>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <Link to="/admin/refunds" className="inline-flex h-12 items-center rounded-xl border border-neutral-200 px-6 text-sm font-black text-neutral-800 hover:bg-neutral-50">Đóng</Link>
            <div className="flex flex-wrap justify-end gap-3">{renderActionButtons()}</div>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white p-10 text-center text-sm font-semibold text-neutral-500">
          Không tìm thấy yêu cầu hoàn tiền.
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/90 p-4" onClick={() => setPreviewImage(null)}>
          <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Đóng ảnh">
            <X className="h-5 w-5" />
          </button>
          <img src={previewImage} alt="Ảnh minh chứng phóng to" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={handleActionSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Xác nhận thao tác</p>
            <h2 className="mt-2 text-2xl font-black text-neutral-950">#{getRefundId(refund)}</h2>
            <p className="mt-2 text-sm font-medium text-neutral-500">Đơn hàng #{refund?.orderId || '-'} - {formatCurrency(refund?.refundAmount)}</p>
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
              <button type="button" onClick={closeActionModal} disabled={isSubmitting} className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-600 hover:border-emerald-500 disabled:opacity-60">Hủy</button>
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

export default AdminRefundDetail
