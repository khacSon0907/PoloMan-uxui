import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { userApi } from '../features/user'
import { getApiMessage, tokenStorage } from '../shared/api'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

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

function getUpdatedUserFromResponse(response) {
  const data = response?.data ?? response
  return data?.user || data?.account || data?.profile || data
}

function getProfileForm(user) {
  return {
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
  }
}

function getUpdatePayload(user, values = {}) {
  return {
    username: values.username ?? user?.username ?? '',
    phoneNumber: values.phoneNumber ?? user?.phoneNumber ?? '',
    avatarUrl: values.avatarUrl ?? user?.avatarUrl ?? '',
  }
}

function Account() {
  const [searchParams, setSearchParams] = useSearchParams()
  const avatarInputRef = useRef(null)
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [profileForm, setProfileForm] = useState(() => getProfileForm(tokenStorage.getUser()))
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'profile'
  const user = authSnapshot.user
  const displayedAvatarUrl = avatarPreviewUrl || user?.avatarUrl

  const profileFields = useMemo(() => [
    { label: 'Tên hiển thị', value: getDisplayName(user) },
    { label: 'Email', value: user?.email || 'Chưa cập nhật' },
    { label: 'Số điện thoại', value: user?.phoneNumber || 'Chưa cập nhật' },
    { label: 'Mã tài khoản', value: user?.id || 'Chưa cập nhật' },
    { label: 'Vai trò', value: user?.roles?.length ? user.roles.join(', ') : 'Khách hàng' },
  ], [user])

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    if (!avatarPreviewUrl) return undefined

    return () => {
      URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

  const handleAvatarClick = () => {
    if (isSavingProfile) return
    avatarInputRef.current?.click()
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleStartEditProfile = () => {
    setProfileForm(getProfileForm(user))
    setIsEditingProfile(true)
    setProfileError('')
    setProfileMessage('')
  }

  const resetAvatarPreview = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    setAvatarFile(null)
    setAvatarPreviewUrl('')
  }

  const handleCancelEditProfile = () => {
    setProfileForm(getProfileForm(user))
    setIsEditingProfile(false)
    setProfileError('')
    setProfileMessage('')
    resetAvatarPreview()
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    const payload = getUpdatePayload(user, {
      username: profileForm.username.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
    })

    if (!payload.username) {
      setProfileError('Vui lòng nhập tên hiển thị')
      setProfileMessage('')
      return
    }


    setIsSavingProfile(true)
    setProfileError('')
    setProfileMessage('')

    try {
      let avatarUrl = payload.avatarUrl

      if (avatarFile) {
        const uploadResult = await uploadImageToCloudinary(avatarFile, 'USER_AVATAR')
        avatarUrl = uploadResult.secure_url || uploadResult.url

        if (!avatarUrl) {
          throw new Error('Cloudinary không trả về link ảnh')
        }
      }

      const finalPayload = {
        ...payload,
        avatarUrl,
      }
      const updateResponse = await userApi.updateMe(finalPayload)
      const updatedUser = getUpdatedUserFromResponse(updateResponse)
      const syncedUser = await userApi.getMe().catch(() => null)

      tokenStorage.setUser(
        syncedUser || {
          ...user,
          ...finalPayload,
          ...updatedUser,
          avatarUrl: updatedUser?.avatarUrl || avatarUrl,
        },
      )
      resetAvatarPreview()
      setIsEditingProfile(false)
      setProfileMessage('Cập nhật thông tin cá nhân thành công')
    } catch (error) {
      setProfileError(getApiMessage(error, 'Cập nhật thông tin cá nhân thất bại'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileError('Vui lòng chọn file ảnh')
      setProfileMessage('')
      return
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setProfileForm(getProfileForm(user))
    setIsEditingProfile(true)
    setProfileError('')
    setProfileMessage('Ảnh mới đang được xem trước. Bấm lưu thay đổi để cập nhật.')
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isSavingProfile}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-2xl font-semibold text-neutral-900 shadow-sm transition-colors hover:border-black disabled:cursor-wait disabled:opacity-70 sm:h-24 sm:w-24 sm:text-3xl"
              aria-label="Chọn ảnh đại diện"
              title="Chọn ảnh đại diện"
            >
              {displayedAvatarUrl ? (
                <img src={displayedAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitial(user)
              )}
              {isSavingProfile && (
                <span className="absolute inset-0 rounded-full border-2 border-neutral-300 border-t-black animate-spin" />
              )}
            </button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Tài khoản của tôi
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold text-neutral-950 sm:text-3xl">
                {getDisplayName(user)}
              </h1>
              {user?.email && (
                <p className="mt-1 truncate text-sm text-neutral-500">{user.email}</p>
              )}
              {avatarFile && (
                <p className="mt-2 text-sm text-neutral-500">Đang xem trước ảnh mới</p>
              )}
            </div>
          </div>

          <div className="inline-flex w-full rounded-lg border border-neutral-200 bg-neutral-50 p-1 md:w-auto">
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'profile' })}
              className={`h-10 flex-1 rounded-md px-3 text-sm font-semibold transition-colors md:flex-none md:px-4 ${
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
              className={`h-10 flex-1 rounded-md px-3 text-sm font-semibold transition-colors md:flex-none md:px-4 ${
                activeTab === 'orders'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Lịch sử order
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Thông tin cá nhân</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Cập nhật tên hiển thị, số điện thoại và ảnh đại diện.
              </p>
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={handleStartEditProfile}
                className="h-10 w-fit rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:border-black"
              >
                Chỉnh sửa
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="mt-5 grid gap-4 lg:grid-cols-2 lg:gap-x-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-neutral-600">Tên hiển thị</span>
                <input
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  disabled={isSavingProfile}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-black disabled:bg-neutral-50"
                />
              </label>
              <div className="grid gap-2">
                <span className="text-sm font-medium text-neutral-600">Email</span>
                <p className="flex h-11 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500">
                  {user?.email || 'Chưa cập nhật'}
                </p>
              </div>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-neutral-600">Số điện thoại</span>
                <input
                  name="phoneNumber"
                  value={profileForm.phoneNumber}
                  onChange={handleProfileChange}
                  disabled={isSavingProfile}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-black disabled:bg-neutral-50"
                />
              </label>
              {(profileMessage || profileError) && (
                <p className={`text-sm lg:col-span-2 ${profileError ? 'text-red-600' : 'text-green-700'}`}>
                  {profileError || profileMessage}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1 lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingProfile && (
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  disabled={isSavingProfile}
                  className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 transition-colors hover:border-black hover:text-black disabled:cursor-wait disabled:opacity-60"
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <>
              {(profileMessage || profileError) && (
                <p className={`mt-5 text-sm ${profileError ? 'text-red-600' : 'text-green-700'}`}>
                  {profileError || profileMessage}
                </p>
              )}
              <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
                {profileFields.map((field) => (
                  <div key={field.label} className="border-b border-neutral-100 py-4">
                    <p className="text-sm font-medium text-neutral-500">{field.label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-neutral-950">{field.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-neutral-950">Lịch sử order</h2>
          <div className="mt-5 divide-y divide-neutral-100 border-y border-neutral-100">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:gap-4 lg:grid-cols-[150px_1fr_140px_160px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">#{order.id}</p>
                  <p className="mt-1 text-xs text-neutral-500">{order.date}</p>
                </div>
                <p className="text-sm text-neutral-700 sm:col-span-2 lg:col-span-1">{order.items}</p>
                <span className="w-fit rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {order.status}
                </span>
                <p className="text-sm font-semibold text-neutral-950 sm:text-right">
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
