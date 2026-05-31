import { useEffect, useMemo, useRef, useState } from 'react'

import { bannerApi } from '../../features/banner'
import { getApiMessage } from '../../shared/api'
import { uploadImageToCloudinary } from '../../shared/services/cloudinaryUpload'

const initialForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '/products',
  active: true,
  sortOrder: 0,
}

function normalizeBanner(banner) {
  if (!banner) return null

  return {
    ...banner,
    active: banner.active !== false,
    sortOrder: Number(banner.sortOrder || 0),
  }
}

function getBannerId(banner) {
  return banner?.id || banner?._id || banner?.imageUrl || banner?.title
}

function AdminBanners() {
  const fileInputRef = useRef(null)
  const [banners, setBanners] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingBanner, setEditingBanner] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isEditing = Boolean(getBannerId(editingBanner))
  const activeCount = useMemo(
    () => banners.filter((banner) => banner.active !== false).length,
    [banners],
  )

  const loadBanners = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const list = await bannerApi.list()
      setBanners(Array.isArray(list) ? list.map(normalizeBanner).filter(Boolean) : [])
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tai danh sach banner.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    bannerApi
      .list()
      .then((list) => {
        if (isMounted) {
          setBanners(Array.isArray(list) ? list.map(normalizeBanner).filter(Boolean) : [])
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getApiMessage(error, 'Khong the tai danh sach banner.'))
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

  useEffect(() => {
    if (!imagePreviewUrl) return undefined

    return () => {
      URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const resetImagePreview = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(null)
    setImagePreviewUrl('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingBanner(null)
    resetImagePreview()
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui long chon file anh.')
      return
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleEdit = (banner) => {
    setEditingBanner(banner)
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '/products',
      active: banner.active !== false,
      sortOrder: Number(banner.sortOrder || 0),
    })
    resetImagePreview()
    setErrorMessage('')
    setSuccessMessage('')
  }

  const buildPayload = async () => {
    let imageUrl = form.imageUrl.trim()

    if (imageFile) {
      const uploadResult = await uploadImageToCloudinary(imageFile, 'BANNER')
      imageUrl = uploadResult.secure_url || uploadResult.url

      if (!imageUrl) {
        throw new Error('Cloudinary khong tra ve link anh banner.')
      }
    }

    return {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      imageUrl,
      linkUrl: form.linkUrl.trim(),
      active: form.active,
      sortOrder: Number(form.sortOrder || 0),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      setErrorMessage('Tieu de banner khong duoc de trong.')
      return
    }

    if (!form.imageUrl.trim() && !imageFile) {
      setErrorMessage('Vui long nhap URL anh hoac upload anh banner.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await buildPayload()

      if (isEditing) {
        const updatedBanner = await bannerApi.update(getBannerId(editingBanner), payload)
        const normalizedBanner = normalizeBanner(updatedBanner) || {
          ...editingBanner,
          ...payload,
        }

        setBanners((current) =>
          current.map((banner) =>
            getBannerId(banner) === getBannerId(editingBanner) ? normalizedBanner : banner,
          ),
        )
        resetForm()
        setSuccessMessage('Cap nhat banner thanh cong.')
      } else {
        const createdBanner = await bannerApi.create(payload)
        setBanners((current) => [normalizeBanner(createdBanner), ...current].filter(Boolean))
        resetForm()
        setSuccessMessage('Tao banner thanh cong.')
      }
    } catch (error) {
      setErrorMessage(getApiMessage(error, isEditing ? 'Cap nhat banner that bai.' : 'Tao banner that bai.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (banner) => {
    const bannerId = getBannerId(banner)

    if (!bannerId || !window.confirm(`Xoa banner "${banner.title}"?`)) {
      return
    }

    setDeletingId(bannerId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await bannerApi.delete(bannerId)
      setBanners((current) => current.filter((item) => getBannerId(item) !== bannerId))

      if (getBannerId(editingBanner) === bannerId) {
        resetForm()
      }

      setSuccessMessage('Xoa banner thanh cong.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Xoa banner that bai.'))
    } finally {
      setDeletingId('')
    }
  }

  const previewImageUrl = imagePreviewUrl || form.imageUrl

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-neutral-950 p-5 text-white sm:p-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Banner manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Banner trang chu
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tao va cap nhat anh hero ngoai trang chu ma khong can sua code frontend.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{banners.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Dang hien</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Tieu de
              </span>
              <input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                placeholder="BST MUA HE 2026"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Mo ta
              </span>
              <textarea
                value={form.subtitle}
                onChange={(event) => updateForm('subtitle', event.target.value)}
                rows={3}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-black"
                placeholder="Noi dung hien thi tren hero..."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Link nut xem
                </span>
                <input
                  value={form.linkUrl}
                  onChange={(event) => updateForm('linkUrl', event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                  placeholder="/products"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Thu tu
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm('sortOrder', event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                URL anh
              </span>
              <input
                value={form.imageUrl}
                onChange={(event) => updateForm('imageUrl', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Upload anh banner
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
              />
            </label>

            <label className="flex h-11 items-center justify-between rounded-md border border-neutral-200 px-3">
              <span className="text-sm font-semibold text-neutral-700">Active</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
                className="h-5 w-5 accent-black"
              />
            </label>
          </div>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center text-sm font-semibold text-neutral-400">
                  Chua co anh
                </div>
              )}
            </div>

            <div className="min-h-5 text-sm">
              {errorMessage && <p className="font-medium text-red-600">{errorMessage}</p>}
              {successMessage && <p className="font-medium text-emerald-600">{successMessage}</p>}
              {isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">Dang sua: {editingBanner.title}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-md border border-neutral-200 px-5 text-sm font-bold uppercase tracking-[0.14em] text-neutral-700 hover:border-black hover:text-black"
                >
                  Huy
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-md bg-neutral-950 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Dang luu...' : isEditing ? 'Cap nhat banner' : 'Tao banner'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">Danh sach banner</h2>
          <button
            type="button"
            onClick={loadBanners}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          </div>
        ) : banners.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Banner</th>
                  <th className="px-5 py-3">Link</th>
                  <th className="px-5 py-3">Thu tu</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {banners.map((banner) => {
                  const bannerId = getBannerId(banner)

                  return (
                    <tr key={bannerId} className={getBannerId(editingBanner) === bannerId ? 'bg-neutral-50' : 'bg-white'}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                            {banner.imageUrl ? (
                              <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-neutral-400">No img</div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-950">{banner.title}</div>
                            <div className="mt-1 max-w-xl text-sm text-neutral-500">{banner.subtitle || 'Chua co mo ta'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">{banner.linkUrl || '-'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">{banner.sortOrder || 0}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            banner.active === false
                              ? 'border-neutral-200 text-neutral-500'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {banner.active === false ? 'An' : 'Dang hien'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(banner)}
                            className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-black hover:text-black"
                          >
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner)}
                            disabled={deletingId === bannerId}
                            className="h-9 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === bannerId ? 'Dang xoa' : 'Xoa'}
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
            <h3 className="text-sm font-semibold text-neutral-950">Chua co banner</h3>
            <p className="mt-2 text-sm text-neutral-500">Tao banner dau tien de hien thi tren trang chu.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminBanners
