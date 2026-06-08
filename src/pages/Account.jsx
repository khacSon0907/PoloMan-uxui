import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { addressApi, userApi } from '../features/user'
import { getApiMessage, tokenStorage } from '../shared/api'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tài khoản'
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || 'U'
}

function getUserId(user) {
  return user?.id || user?.userId || user?._id || user?.sub || ''
}

function getProfileForm(user) {
  return {
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
  }
}

function getUpdatedUserFromResponse(response) {
  const data = response?.data ?? response
  return data?.user || data?.account || data?.profile || data
}

function getAddressName(address, key) {
  return address?.[`${key}Name`] || address?.[key] || ''
}

function formatFullAddress(address) {
  return [
    getAddressName(address, 'ward'),
    getAddressName(address, 'district'),
    getAddressName(address, 'province'),
    address?.streetAddress,
  ]
    .filter(Boolean)
    .join(', ')
}

function Account() {
  const avatarInputRef = useRef(null)
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const user = authSnapshot.user
  const userId = getUserId(user)
  const [profileForm, setProfileForm] = useState(() => getProfileForm(tokenStorage.getUser()))
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [addresses, setAddresses] = useState([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
  const [addressError, setAddressError] = useState('')
  const displayedAvatarUrl = avatarPreviewUrl || user?.avatarUrl

  const profileFields = useMemo(
    () => [
      { label: 'Tên hiển thị', value: getDisplayName(user) },
      { label: 'Email', value: user?.email || 'Chưa cập nhật' },
      { label: 'Số điện thoại', value: user?.phoneNumber || 'Chưa cập nhật' },
      { label: 'Mã tài khoản', value: user?.id || 'Chưa cập nhật' },
    ],
    [user],
  )

  const defaultAddress = useMemo(
    () => addresses.find((address) => address?.isDefault) || addresses[0] || null,
    [addresses],
  )

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    Promise.resolve().then(() => {
      setProfileForm(getProfileForm(user))
    })
  }, [user])

  useEffect(() => {
    if (!avatarPreviewUrl) return undefined
    return () => URL.revokeObjectURL(avatarPreviewUrl)
  }, [avatarPreviewUrl])

  useEffect(() => {
    let isMounted = true

    if (!userId) {
      Promise.resolve().then(() => {
        if (isMounted) setAddresses([])
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoadingAddresses(true)
      setAddressError('')
    })

    addressApi
      .getAddresses(userId)
      .then((list) => {
        if (!isMounted) return
        setAddresses(list)
        const nextDefaultAddress = list.find((address) => address?.isDefault) || list[0]
        if (nextDefaultAddress) tokenStorage.setUser({ ...tokenStorage.getUser(), address: nextDefaultAddress })
      })
      .catch((error) => {
        if (isMounted) setAddressError(getApiMessage(error, 'Không thể tải danh sách địa chỉ.'))
      })
      .finally(() => {
        if (isMounted) setIsLoadingAddresses(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const resetAvatarPreview = () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    setAvatarFile(null)
    setAvatarPreviewUrl('')
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((current) => ({ ...current, [name]: value }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      username: profileForm.username.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
      avatarUrl: user?.avatarUrl || '',
    }

    if (!payload.username) {
      setProfileError('Vui lòng nhập tên hiển thị.')
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
        if (!avatarUrl) throw new Error('Cloudinary không trả về link ảnh')
      }

      const finalPayload = { ...payload, avatarUrl }
      const updateResponse = await userApi.updateMe(finalPayload)
      const updatedUser = getUpdatedUserFromResponse(updateResponse)
      const syncedUser = await userApi.getMe().catch(() => null)

      tokenStorage.setUser({
        ...(syncedUser || user),
        ...(!syncedUser ? finalPayload : {}),
        ...(!syncedUser ? updatedUser : {}),
        address: tokenStorage.getUser()?.address,
        avatarUrl: updatedUser?.avatarUrl || syncedUser?.avatarUrl || avatarUrl,
      })
      resetAvatarPreview()
      setIsEditingProfile(false)
      setProfileMessage('Cập nhật thông tin cá nhân thành công.')
    } catch (error) {
      setProfileError(getApiMessage(error, 'Cập nhật thông tin cá nhân thất bại.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarClick = () => {
    if (!isSavingProfile) avatarInputRef.current?.click()
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError('Vui lòng chọn file ảnh.')
      setProfileMessage('')
      return
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setIsEditingProfile(true)
    setProfileError('')
    setProfileMessage('Ảnh mới đang được xem trước. Bấm lưu thay đổi để cập nhật.')
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_12px_40px_rgba(20,83,45,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isSavingProfile}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 text-2xl font-semibold text-emerald-700 shadow-sm hover:border-emerald-500 disabled:cursor-wait disabled:opacity-70 sm:h-24 sm:w-24 sm:text-3xl"
              aria-label="Chọn ảnh đại diện"
              title="Chọn ảnh đại diện"
            >
              {displayedAvatarUrl ? <img src={displayedAvatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
              {isSavingProfile && <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />}
            </button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Tài khoản của tôi</p>
              <h1 className="mt-2 truncate text-2xl font-semibold text-emerald-800 sm:text-3xl">{getDisplayName(user)}</h1>
              {user?.email && <p className="mt-1 truncate text-sm text-emerald-600">{user.email}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/account/orders"
              className="inline-flex h-10 items-center rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
            >
              Lịch sử order
            </Link>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  setProfileForm(getProfileForm(user))
                  setIsEditingProfile(true)
                  setProfileError('')
                  setProfileMessage('')
                }}
                className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Chỉnh sửa hồ sơ
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 border-b border-emerald-100 pb-5">
          <h2 className="text-lg font-semibold text-emerald-800">Thông tin cá nhân</h2>
          <p className="text-sm text-emerald-600">Cập nhật tên hiển thị, số điện thoại và ảnh đại diện.</p>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-emerald-700">Tên hiển thị</span>
              <input
                name="username"
                value={profileForm.username}
                onChange={handleProfileChange}
                disabled={isSavingProfile}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm text-emerald-800 outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-emerald-700">Số điện thoại</span>
              <input
                name="phoneNumber"
                value={profileForm.phoneNumber}
                onChange={handleProfileChange}
                disabled={isSavingProfile}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm text-emerald-800 outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
              />
            </label>
            <div className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-medium text-emerald-700">Email</span>
              <p className="flex h-11 items-center rounded-md border border-emerald-100 bg-emerald-50/60 px-3 text-sm text-emerald-500">
                {user?.email || 'Chưa cập nhật'}
              </p>
            </div>
            {(profileMessage || profileError) && (
              <p className={`text-sm lg:col-span-2 ${profileError ? 'text-red-500' : 'text-emerald-600'}`}>
                {profileError || profileMessage}
              </p>
            )}
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSavingProfile && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false)
                  setProfileError('')
                  setProfileMessage('')
                  resetAvatarPreview()
                }}
                disabled={isSavingProfile}
                className="h-10 rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-600 hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-60"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <>
            {(profileMessage || profileError) && (
              <p className={`mt-5 text-sm ${profileError ? 'text-red-500' : 'text-emerald-600'}`}>{profileError || profileMessage}</p>
            )}
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
              {profileFields.map((field) => (
                <div key={field.label} className="border-b border-emerald-100 py-4">
                  <p className="text-sm font-medium text-emerald-500">{field.label}</p>
                  <p className="mt-1 break-words text-sm font-medium text-emerald-800">{field.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-emerald-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-emerald-800">Địa chỉ giao hàng</h2>
            <p className="mt-1 text-sm text-emerald-600">Chọn một địa chỉ để xem chi tiết hoặc chỉnh sửa.</p>
          </div>
          <Link
            to="/account/addresses/new"
            className="inline-flex h-10 w-fit items-center rounded-md border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
          >
            Thêm địa chỉ
          </Link>
        </div>

        {isLoadingAddresses ? (
          <p className="mt-5 text-sm text-emerald-600">Đang tải địa chỉ...</p>
        ) : addressError ? (
          <p className="mt-5 text-sm text-red-500">{addressError}</p>
        ) : addresses.length ? (
          <div className="mt-5 grid gap-4">
            {addresses.map((address) => (
              <Link
                key={address.id}
                to={`/account/addresses/${address.id}`}
                className={`block rounded-xl border p-4 transition-colors hover:border-emerald-500 hover:bg-emerald-50/60 ${
                  address?.isDefault ? 'border-emerald-400 bg-emerald-50/70' : 'border-emerald-100 bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-emerald-900">{address.receiverName}</h3>
                      {address?.isDefault && (
                        <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">Mặc định</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-emerald-700">{address.receiverPhone}</p>
                    <p className="mt-2 break-words text-sm text-emerald-900/70">{formatFullAddress(address)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">Xem chi tiết</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-sm text-emerald-700">
            Chưa có địa chỉ giao hàng. Thêm địa chỉ đầu tiên để dùng khi thanh toán.
          </div>
        )}

        {defaultAddress && (
          <div className="mt-5 rounded-xl bg-emerald-900 px-4 py-3 text-sm text-white">
            Địa chỉ mặc định: <span className="font-semibold">{formatFullAddress(defaultAddress)}</span>
          </div>
        )}
      </section>
    </div>
  )
}

export default Account
