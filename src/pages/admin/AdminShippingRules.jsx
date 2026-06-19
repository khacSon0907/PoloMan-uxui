import { useEffect, useMemo, useState } from 'react'

import { formatCurrency } from '../../features/product'
import { getShippingRuleId, shippingRuleApi } from '../../features/shippingRule'
import { getApiMessage } from '../../shared/api'

const initialForm = {
  name: '',
  defaultShippingFee: 30000,
  freeShippingThreshold: 500000,
  freeShippingDatesText: '',
  active: true,
}

function parseFreeShippingDates(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((date) => date.trim())
    .filter(Boolean)
}

function formatDatesForInput(dates) {
  return Array.isArray(dates) ? dates.join('\n') : ''
}

function formatDateList(dates) {
  if (!Array.isArray(dates) || !dates.length) return '-'
  return dates.join(', ')
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    defaultShippingFee: Number(form.defaultShippingFee || 0),
    freeShippingThreshold: Number(form.freeShippingThreshold || 0),
    freeShippingDates: parseFreeShippingDates(form.freeShippingDatesText),
    active: form.active === true,
  }
}

function AdminShippingRules() {
  const [rules, setRules] = useState([])
  const [activeRule, setActiveRule] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [editingRule, setEditingRule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isEditing = Boolean(getShippingRuleId(editingRule))
  const activeRuleId = getShippingRuleId(activeRule)

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => Number(b.active === true) - Number(a.active === true)),
    [rules],
  )

  const loadRules = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [list, active] = await Promise.all([
        shippingRuleApi.list(),
        shippingRuleApi.getActive().catch(() => null),
      ])
      setRules(Array.isArray(list) ? list : [])
      setActiveRule(active)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tai cau hinh phi ship.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      loadRules()
    })
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingRule(null)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleEdit = (rule) => {
    setEditingRule(rule)
    setForm({
      name: rule.name || '',
      defaultShippingFee: Number(rule.defaultShippingFee || 0),
      freeShippingThreshold: Number(rule.freeShippingThreshold || 0),
      freeShippingDatesText: formatDatesForInput(rule.freeShippingDates),
      active: rule.active === true,
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload(form)

    if (!payload.name) {
      setErrorMessage('Ten rule khong duoc de trong.')
      return
    }

    if (payload.defaultShippingFee < 0 || payload.freeShippingThreshold < 0) {
      setErrorMessage('Phi ship va nguong mien phi khong duoc am.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (isEditing) {
        await shippingRuleApi.update(getShippingRuleId(editingRule), payload)
        setSuccessMessage('Da cap nhat rule phi ship.')
      } else {
        await shippingRuleApi.create(payload)
        setSuccessMessage('Da tao rule phi ship.')
      }

      resetForm()
      await loadRules()
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the luu rule phi ship.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (rule) => {
    const ruleId = getShippingRuleId(rule)
    if (!ruleId) return

    setDeletingId(ruleId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await shippingRuleApi.delete(ruleId)
      setSuccessMessage('Da xoa rule phi ship.')
      if (getShippingRuleId(editingRule) === ruleId) resetForm()
      await loadRules()
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the xoa rule phi ship.'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700/65">Shipping rules</p>
          <h1 className="mt-2 text-3xl font-black text-emerald-950">Quan ly phi van chuyen</h1>
          <p className="mt-2 text-sm text-neutral-500">Cau hinh phi ship mac dinh, nguong freeship va ngay freeship.</p>
        </div>
        <button
          type="button"
          onClick={loadRules}
          className="h-11 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50"
        >
          Tai lai
        </button>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            errorMessage
              ? 'border-red-100 bg-red-50 text-red-600'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-emerald-950">{isEditing ? 'Sua rule' : 'Tao rule moi'}</h2>
            <p className="mt-1 text-sm text-neutral-500">Neu active=true, backend se tu tat cac rule active khac.</p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-emerald-950">Ten rule</span>
            <input
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              className="h-11 rounded-lg border border-emerald-100 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="Rule mac dinh"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-emerald-950">Phi ship mac dinh</span>
            <input
              type="number"
              min="0"
              value={form.defaultShippingFee}
              onChange={(event) => updateForm('defaultShippingFee', event.target.value)}
              className="h-11 rounded-lg border border-emerald-100 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-emerald-950">Nguong mien phi van chuyen</span>
            <input
              type="number"
              min="0"
              value={form.freeShippingThreshold}
              onChange={(event) => updateForm('freeShippingThreshold', event.target.value)}
              className="h-11 rounded-lg border border-emerald-100 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-emerald-950">Ngay mien phi ship</span>
            <textarea
              value={form.freeShippingDatesText}
              onChange={(event) => updateForm('freeShippingDatesText', event.target.value)}
              rows={4}
              className="resize-none rounded-lg border border-emerald-100 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
              placeholder="2026-06-19&#10;2026-06-20"
            />
            <span className="text-xs text-neutral-500">Nhap moi ngay mot dong hoac cach nhau bang dau phay.</span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm('active', event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            <span className="text-sm font-bold text-emerald-950">Active rule nay</span>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 flex-1 rounded-lg bg-emerald-800 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Dang luu...' : isEditing ? 'Cap nhat' : 'Tao rule'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="h-11 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-black text-neutral-600 hover:bg-neutral-50"
              >
                Huy
              </button>
            )}
          </div>
        </form>

        <section className="rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-100 p-5">
            <h2 className="text-xl font-black text-emerald-950">Danh sach rule</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Rule active hien tai: {activeRule?.name || 'Chua co'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-emerald-100 text-left text-sm">
              <thead className="bg-emerald-50/60 text-xs font-black uppercase tracking-[0.12em] text-emerald-900/70">
                <tr>
                  <th className="px-4 py-3">Rule</th>
                  <th className="px-4 py-3">Phi mac dinh</th>
                  <th className="px-4 py-3">Nguong freeship</th>
                  <th className="px-4 py-3">Ngay freeship</th>
                  <th className="px-4 py-3">Trang thai</th>
                  <th className="px-4 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                      Dang tai rule phi ship...
                    </td>
                  </tr>
                ) : sortedRules.length ? (
                  sortedRules.map((rule) => {
                    const ruleId = getShippingRuleId(rule)
                    const isActive = rule.active === true || ruleId === activeRuleId

                    return (
                      <tr key={ruleId} className={isActive ? 'bg-emerald-50/70' : 'bg-white'}>
                        <td className="px-4 py-4">
                          <p className="font-black text-emerald-950">{rule.name}</p>
                          <p className="mt-1 text-xs text-neutral-400">{ruleId}</p>
                        </td>
                        <td className="px-4 py-4 font-bold text-neutral-700">{formatCurrency(rule.defaultShippingFee)}</td>
                        <td className="px-4 py-4 font-bold text-neutral-700">{formatCurrency(rule.freeShippingThreshold)}</td>
                        <td className="max-w-xs px-4 py-4 text-neutral-600">{formatDateList(rule.freeShippingDates)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.1em] ${
                              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(rule)}
                              className="rounded-lg border border-emerald-100 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-700 hover:bg-emerald-50"
                            >
                              Sua
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rule)}
                              disabled={deletingId === ruleId}
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === ruleId ? 'Dang xoa' : 'Xoa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                      Chua co rule phi ship.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}

export default AdminShippingRules
