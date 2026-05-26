import { useEffect, useMemo, useState } from 'react'

import { categoryApi } from '../../features/category'
import { getApiMessage } from '../../shared/api'

const initialForm = {
  name: '',
  description: '',
  active: true,
}

function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const activeCount = useMemo(
    () => categories.filter((category) => category.active !== false).length,
    [categories],
  )

  const loadCategories = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const list = await categoryApi.list()
      setCategories(Array.isArray(list) ? list : [])
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tai danh sach danh muc.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    categoryApi
      .list()
      .then((list) => {
        if (isMounted) setCategories(Array.isArray(list) ? list : [])
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai danh sach danh muc.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (field) => (event) => {
    const value = field === 'active' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
    }

    if (payload.name.length < 2) {
      setErrorMessage('Ten danh muc phai tu 2 ky tu tro len.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const createdCategory = await categoryApi.create(payload)
      setCategories((current) => [createdCategory, ...current.filter(Boolean)])
      setForm(initialForm)
      setSuccessMessage('Tao danh muc thanh cong.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Tao danh muc that bai.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-fuchsia-200 bg-white">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#111827_0%,#7c3aed_48%,#f97316_100%)] p-5 text-white sm:p-6 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Category manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Tao danh muc san pham</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Quan ly cac nhom san pham hien thi ngoai website. Danh muc active se duoc dua
              vao khu vuc noi bat va bo loc san pham.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs text-white/70">Tong danh muc</p>
              <p className="mt-2 text-3xl font-black">{categories.length}</p>
            </div>
            <div className="rounded-md border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs text-white/70">Dang hien thi</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_140px] lg:items-end">
          <div>
            <label htmlFor="category-name" className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              Ten danh muc
            </label>
            <input
              id="category-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Ao polo, Ao so mi, Phu kien..."
              className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label htmlFor="category-description" className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              Mo ta ngan
            </label>
            <input
              id="category-description"
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Mo ta giup SEO va hien thi ngoai website"
              className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-fuchsia-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 lg:h-11">
            <label htmlFor="category-active" className="text-sm font-semibold text-neutral-700">
              Active
            </label>
            <input
              id="category-active"
              type="checkbox"
              checked={form.active}
              onChange={handleChange('active')}
              className="h-5 w-5 accent-fuchsia-600"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
            <div className="min-h-5 text-sm">
              {errorMessage && <p className="font-medium text-red-600">{errorMessage}</p>}
              {successMessage && <p className="font-medium text-emerald-600">{successMessage}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-md bg-neutral-950 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? 'Dang tao...' : 'Tao danh muc'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">Danh sach danh muc</h2>
          <button
            type="button"
            onClick={loadCategories}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:border-black hover:text-black sm:w-auto"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-9 w-9 rounded-full border-2 border-neutral-200 border-t-fuchsia-600 animate-spin" />
          </div>
        ) : categories.length ? (
          <div className="divide-y divide-neutral-100">
            {categories.map((category, index) => (
              <article
                key={category.id || category.slug || category.name}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[56px_1fr] sm:gap-4 sm:px-5 lg:grid-cols-[56px_1fr_140px_100px] lg:items-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[linear-gradient(135deg,#f97316,#ec4899,#6366f1)] text-lg font-black text-white sm:h-12 sm:w-12">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-950">{category.name}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {category.description || 'Chua co mo ta'}
                  </p>
                  {category.slug && (
                    <p className="mt-1 text-xs font-semibold text-fuchsia-600">/{category.slug}</p>
                  )}
                </div>
                <span className="w-fit rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500 sm:col-start-2 lg:col-start-auto">
                  {category.active === false ? 'An' : 'Dang hien'}
                </span>
                <span className="text-sm font-semibold text-neutral-400 sm:col-start-2 lg:col-start-auto lg:text-right">
                  {category.id?.slice?.(-6) || 'new'}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">Chua co danh muc</h3>
            <p className="mt-2 text-sm text-neutral-500">Tao danh muc dau tien de hien thi ngoai website.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminCategories
