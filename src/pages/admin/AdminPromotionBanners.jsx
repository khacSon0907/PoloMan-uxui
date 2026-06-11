import { useEffect, useMemo, useState } from 'react'

import { promotionBannerApi } from '../../features/promotionBanner'
import { getApiMessage } from '../../shared/api'

const initialForm = {
  title: '',
  active: true,
  sortOrder: 0,
  startDate: '',
  endDate: '',
}

function getPromotionId(promotion) {
  return promotion?.id || promotion?._id || promotion?.title
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function toInstant(value) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function splitDateTime(value) {
  if (!value) return { date: '', time: '' }

  const [date = '', time = ''] = value.split('T')
  return {
    date,
    time: time.slice(0, 5),
  }
}

function mergeDateTime(date, time) {
  if (!date) return ''

  return `${date}T${time || '00:00'}`
}

function getQuickRange(days) {
  const start = new Date()
  const end = new Date(start)
  end.setDate(start.getDate() + days)

  return {
    startDate: toDateTimeLocal(start.toISOString()),
    endDate: toDateTimeLocal(end.toISOString()),
  }
}

function normalizePromotion(promotion) {
  if (!promotion) return null

  return {
    ...promotion,
    active: promotion.active !== false,
    sortOrder: Number(promotion.sortOrder || 0),
  }
}

function isCurrentlyVisible(promotion) {
  if (!promotion || promotion.active === false) return false

  const now = new Date()
  const startDate = promotion.startDate ? new Date(promotion.startDate) : null
  const endDate = promotion.endDate ? new Date(promotion.endDate) : null

  if (startDate && !Number.isNaN(startDate.getTime()) && startDate > now) return false
  if (endDate && !Number.isNaN(endDate.getTime()) && endDate < now) return false

  return true
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function AdminPromotionBanners() {
  const [promotions, setPromotions] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isEditing = Boolean(getPromotionId(editingPromotion))
  const activeCount = useMemo(
    () => promotions.filter((promotion) => promotion.active !== false).length,
    [promotions],
  )
  const visibleCount = useMemo(
    () => promotions.filter(isCurrentlyVisible).length,
    [promotions],
  )
  const startSchedule = splitDateTime(form.startDate)
  const endSchedule = splitDateTime(form.endDate)

  const loadPromotions = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const list = await promotionBannerApi.list()
      setPromotions(
        Array.isArray(list)
          ? list.map(normalizePromotion).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder)
          : [],
      )
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tai promotion banner.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    promotionBannerApi
      .list()
      .then((list) => {
        if (!isMounted) return

        setPromotions(
          Array.isArray(list)
            ? list.map(normalizePromotion).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder)
            : [],
        )
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getApiMessage(error, 'Khong the tai promotion banner.'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingPromotion(null)
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const updateSchedule = (field, part, value) => {
    setForm((current) => {
      const currentValue = splitDateTime(current[field])

      return {
        ...current,
        [field]: mergeDateTime(
          part === 'date' ? value : currentValue.date,
          part === 'time' ? value : currentValue.time,
        ),
      }
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const applyQuickRange = (days) => {
    setForm((current) => ({
      ...current,
      ...getQuickRange(days),
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const clearSchedule = () => {
    setForm((current) => ({
      ...current,
      startDate: '',
      endDate: '',
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion)
    setForm({
      title: promotion.title || '',
      active: promotion.active !== false,
      sortOrder: Number(promotion.sortOrder || 0),
      startDate: toDateTimeLocal(promotion.startDate),
      endDate: toDateTimeLocal(promotion.endDate),
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const buildPayload = () => ({
    title: form.title.trim(),
    active: form.active,
    sortOrder: Number(form.sortOrder || 0),
    startDate: toInstant(form.startDate),
    endDate: toInstant(form.endDate),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      setErrorMessage('Tieu de promotion khong duoc de trong.')
      return
    }

    if (form.title.trim().length > 200) {
      setErrorMessage('Tieu de promotion khong duoc vuot qua 200 ky tu.')
      return
    }

    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      setErrorMessage('Ngay bat dau phai nho hon ngay ket thuc.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = buildPayload()

      if (isEditing) {
        const updatedPromotion = await promotionBannerApi.update(
          getPromotionId(editingPromotion),
          payload,
        )
        const normalizedPromotion = normalizePromotion(updatedPromotion) || {
          ...editingPromotion,
          ...payload,
        }

        setPromotions((current) =>
          current
            .map((promotion) =>
              getPromotionId(promotion) === getPromotionId(editingPromotion)
                ? normalizedPromotion
                : promotion,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder),
        )
        resetForm()
        setSuccessMessage('Cap nhat promotion banner thanh cong.')
      } else {
        const createdPromotion = await promotionBannerApi.create(payload)
        setPromotions((current) =>
          [normalizePromotion(createdPromotion), ...current]
            .filter(Boolean)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        )
        resetForm()
        setSuccessMessage('Tao promotion banner thanh cong.')
      }
    } catch (error) {
      setErrorMessage(
        getApiMessage(
          error,
          isEditing ? 'Cap nhat promotion banner that bai.' : 'Tao promotion banner that bai.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (promotion) => {
    const promotionId = getPromotionId(promotion)

    if (!promotionId || !window.confirm(`Xoa promotion "${promotion.title}"?`)) {
      return
    }

    setDeletingId(promotionId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await promotionBannerApi.delete(promotionId)
      setPromotions((current) => current.filter((item) => getPromotionId(item) !== promotionId))

      if (getPromotionId(editingPromotion) === promotionId) {
        resetForm()
      }

      setSuccessMessage('Xoa promotion banner thanh cong.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Xoa promotion banner that bai.'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#064e3b_0%,#047857_58%,#0f766e_100%)] p-5 text-white sm:p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Promotion manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Thanh quang cao dau trang
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Quan ly cac cau uu dai hien thi o thanh thong bao tren website.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{promotions.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Active</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Dang hien</p>
              <p className="mt-2 text-3xl font-black">{visibleCount}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <section className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
            <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-neutral-950">
                  Noi dung quang cao
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Cau ngan gon se hien thi tren thanh dau trang.
                </p>
              </div>
              <span className="text-xs font-semibold text-neutral-400">
                {form.title.trim().length}/200
              </span>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Tieu de
              </span>
              <textarea
                value={form.title}
                maxLength={200}
                rows={3}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="Don tu 590K: Tang vo cotton"
                className="resize-none rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm leading-6 text-neutral-950 outline-none transition-colors focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-end">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Thu tu
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm('sortOrder', event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                />
              </label>

              <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Preview
                </p>
                <div className="mt-3 flex min-h-10 items-center justify-center gap-3 rounded-md bg-emerald-50 px-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-emerald-950">
                  <span className="h-2 w-2 rounded-full bg-emerald-800" />
                  <span className="line-clamp-1">
                    {form.title.trim() || 'Noi dung promotion se hien thi tai day'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-neutral-950">
                  Lich hien thi
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  De trong neu muon hien thi lien tuc khi active.
                </p>
              </div>
              <label className="inline-flex h-10 items-center gap-3 rounded-md border border-neutral-200 px-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                />
                <span className="text-sm font-semibold text-neutral-700">Active</span>
              </label>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Ngay bat dau
                  </span>
                  <input
                    type="date"
                    value={startSchedule.date}
                    onChange={(event) => updateSchedule('startDate', 'date', event.target.value)}
                    className="h-11 min-w-0 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Gio
                  </span>
                  <input
                    type="time"
                    value={startSchedule.time}
                    onChange={(event) => updateSchedule('startDate', 'time', event.target.value)}
                    className="h-11 min-w-0 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Ngay ket thuc
                  </span>
                  <input
                    type="date"
                    value={endSchedule.date}
                    onChange={(event) => updateSchedule('endDate', 'date', event.target.value)}
                    className="h-11 min-w-0 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Gio
                  </span>
                  <input
                    type="time"
                    value={endSchedule.time}
                    onChange={(event) => updateSchedule('endDate', 'time', event.target.value)}
                    className="h-11 min-w-0 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => applyQuickRange(1)}
                className="h-10 rounded-md border border-neutral-200 px-3 text-xs font-bold uppercase tracking-[0.1em] text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-700"
              >
                24h
              </button>
              <button
                type="button"
                onClick={() => applyQuickRange(7)}
                className="h-10 rounded-md border border-neutral-200 px-3 text-xs font-bold uppercase tracking-[0.1em] text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-700"
              >
                7 ngay
              </button>
              <button
                type="button"
                onClick={() => applyQuickRange(30)}
                className="h-10 rounded-md border border-neutral-200 px-3 text-xs font-bold uppercase tracking-[0.1em] text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-700"
              >
                30 ngay
              </button>
              <button
                type="button"
                onClick={clearSchedule}
                className="h-10 rounded-md border border-red-100 px-3 text-xs font-bold uppercase tracking-[0.1em] text-red-600 transition-colors hover:border-red-500 hover:bg-red-50"
              >
                Xoa lich
              </button>
            </div>
          </aside>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between xl:col-span-2">
            <div className="min-h-5 text-sm">
              {errorMessage && <p className="font-medium text-red-600">{errorMessage}</p>}
              {successMessage && <p className="font-medium text-emerald-600">{successMessage}</p>}
              {isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">
                  Dang sua: {editingPromotion.title}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-md border border-neutral-200 px-5 text-sm font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-600"
                >
                  Huy
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-md bg-emerald-600 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Dang luu...' : isEditing ? 'Cap nhat' : 'Tao promotion'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Danh sach promotion banner
          </h2>
          <button
            type="button"
            onClick={loadPromotions}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : promotions.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Promotion</th>
                  <th className="px-5 py-3">Thoi gian</th>
                  <th className="px-5 py-3">Thu tu</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {promotions.map((promotion) => {
                  const promotionId = getPromotionId(promotion)
                  const visible = isCurrentlyVisible(promotion)

                  return (
                    <tr
                      key={promotionId}
                      className={
                        getPromotionId(editingPromotion) === promotionId
                          ? 'bg-emerald-50/70'
                          : 'bg-white hover:bg-neutral-50/70'
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="font-black text-neutral-950">{promotion.title}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-500">
                        <div>Tu: {formatDateTime(promotion.startDate)}</div>
                        <div className="mt-1">Den: {formatDateTime(promotion.endDate)}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">
                        {promotion.sortOrder || 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            visible
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : promotion.active === false
                                ? 'border-neutral-200 text-neutral-500'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {visible ? 'Dang hien' : promotion.active === false ? 'An' : 'Hen gio'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(promotion)}
                            className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-600"
                          >
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(promotion)}
                            disabled={deletingId === promotionId}
                            className="h-9 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === promotionId ? 'Dang xoa' : 'Xoa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co promotion banner
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Tao promotion dau tien de hien thi tren thanh quang cao website.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminPromotionBanners
