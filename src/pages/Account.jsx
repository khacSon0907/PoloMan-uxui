import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CreditCard,
  Edit3,
  Headphones,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { addressApi, userApi } from '../features/user'
import { getApiMessage, tokenStorage } from '../shared/api'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Tai khoan'
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
    address?.streetAddress,
    getAddressName(address, 'ward'),
    getAddressName(address, 'district'),
    getAddressName(address, 'province'),
  ]
    .filter(Boolean)
    .join(', ')
}

const sidebarItems = [
  { label: 'Thong tin tai khoan', icon: UserRound, active: true, to: '/account' },
  { label: 'Don hang cua toi', icon: Package, to: '/account/orders' },
  { label: 'So dia chi', icon: MapPin, to: '/account/addresses/new' },
  { label: 'Phuong thuc thanh toan', icon: CreditCard, to: '/account' },
  { label: 'Doi mat khau', icon: KeyRound, to: '/change-password' },
  { label: 'Yeu thich', icon: Heart, to: '/favorites' },
]

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
  const [deletingAddressId, setDeletingAddressId] = useState('')
  const [addressError, setAddressError] = useState('')
  const displayedAvatarUrl = avatarPreviewUrl || user?.avatarUrl

  const profileFields = useMemo(
    () => [
      { label: 'Ten hien thi', value: getDisplayName(user), icon: UserRound },
      { label: 'Email', value: user?.email || 'Chua cap nhat', icon: Mail },
      { label: 'So dien thoai', value: user?.phoneNumber || 'Chua cap nhat', icon: Phone },
      { label: 'Ma tai khoan', value: user?.id || user?.userId || 'Chua cap nhat', icon: KeyRound },
    ],
    [user],
  )

  const defaultAddress = useMemo(
    () => addresses.find((address) => address?.isDefault) || addresses[0] || null,
    [addresses],
  )

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    Promise.resolve().then(() => setProfileForm(getProfileForm(user)))
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
        if (isMounted) setAddressError(getApiMessage(error, 'Khong the tai danh sach dia chi.'))
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
      setProfileError('Vui long nhap ten hien thi.')
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
        if (!avatarUrl) throw new Error('Cloudinary khong tra ve link anh')
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
      setProfileMessage('Cap nhat thong tin ca nhan thanh cong.')
    } catch (error) {
      setProfileError(getApiMessage(error, 'Cap nhat thong tin ca nhan that bai.'))
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
      setProfileError('Vui long chon file anh.')
      setProfileMessage('')
      return
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setIsEditingProfile(true)
    setProfileError('')
    setProfileMessage('Anh moi dang duoc xem truoc. Bam luu thay doi de cap nhat.')
  }

  const handleDeleteAddress = async (addressId) => {
    if (!userId || !addressId) return
    if (!window.confirm('Ban co chac muon xoa dia chi nay?')) return

    setDeletingAddressId(addressId)
    setAddressError('')

    try {
      await addressApi.deleteAddress(userId, addressId)
      const nextAddresses = await addressApi.getAddresses(userId).catch(() =>
        addresses.filter((address) => address?.id !== addressId),
      )
      const nextDefaultAddress = nextAddresses.find((address) => address?.isDefault) || nextAddresses[0] || null

      setAddresses(nextAddresses)
      tokenStorage.setUser({ ...tokenStorage.getUser(), address: nextDefaultAddress })
    } catch (error) {
      setAddressError(getApiMessage(error, 'Khong the xoa dia chi.'))
    } finally {
      setDeletingAddressId('')
    }
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-neutral-100 bg-white shadow-[0_18px_50px_rgba(2,44,34,0.06)]">
        <div className="border-b border-neutral-100 p-6">
          <h2 className="text-lg font-black uppercase tracking-[0.08em] text-emerald-900">Tai khoan cua toi</h2>
          <p className="mt-2 text-sm text-neutral-500">Quan ly thong tin va don hang</p>
        </div>
        <nav className="p-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-bold transition-colors ${
                  item.active ? 'bg-emerald-50 text-emerald-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-emerald-900'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-sm font-bold text-neutral-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.8} />
            Dang xuat
          </button>
        </nav>
        <div className="m-6 rounded-2xl bg-emerald-50 p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white">
            <Headphones className="h-7 w-7" />
          </div>
          <p className="mt-4 font-black text-emerald-950">Can ho tro?</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Doi ngu Poloman luon san sang ho tro ban 24/7.</p>
          <button className="mt-4 h-10 w-full rounded-lg border border-emerald-200 bg-white text-sm font-black text-emerald-800 hover:bg-emerald-50">
            Lien he ngay
          </button>
        </div>
      </aside>

      <div className="space-y-6">
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_18px_50px_rgba(2,44,34,0.06)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isSavingProfile}
                className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-100 bg-emerald-50 text-4xl font-black text-emerald-700 shadow-sm"
                aria-label="Chon anh dai dien"
              >
                {displayedAvatarUrl ? <img src={displayedAvatarUrl} alt="" className="h-full w-full object-cover" /> : getInitial(user)}
                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-950 shadow-md">
                  <Camera className="h-5 w-5" />
                </span>
                {isSavingProfile && <span className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-800">Tai khoan cua toi</p>
                <h1 className="mt-3 truncate text-3xl font-black text-neutral-950">{getDisplayName(user)}</h1>
                {user?.email && <p className="mt-2 truncate text-base text-neutral-600">{user.email}</p>}
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Tai khoan da xac thuc
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/account/orders"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-200 px-5 text-sm font-black text-emerald-800 hover:bg-emerald-50"
              >
                <Package className="h-4 w-4" />
                Lich su order
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
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-800 px-5 text-sm font-black text-white hover:bg-emerald-900"
                >
                  <Edit3 className="h-4 w-4" />
                  Chinh sua ho so
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_18px_50px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3">
            <UserRound className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-2xl font-black text-neutral-950">Thong tin ca nhan</h2>
              <p className="mt-1 text-sm text-neutral-500">Cap nhat ten hien thi, so dien thoai va anh dai dien.</p>
            </div>
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="mt-6 grid gap-4 rounded-xl border border-neutral-100 p-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-neutral-700">Ten hien thi</span>
                <input
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  disabled={isSavingProfile}
                  className="h-11 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-700"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-neutral-700">So dien thoai</span>
                <input
                  name="phoneNumber"
                  value={profileForm.phoneNumber}
                  onChange={handleProfileChange}
                  disabled={isSavingProfile}
                  className="h-11 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-700"
                />
              </label>
              {(profileMessage || profileError) && (
                <p className={`text-sm font-semibold lg:col-span-2 ${profileError ? 'text-red-600' : 'text-emerald-700'}`}>
                  {profileError || profileMessage}
                </p>
              )}
              <div className="flex flex-wrap gap-3 lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="h-11 rounded-lg bg-emerald-800 px-5 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-60"
                >
                  {isSavingProfile ? 'Dang luu...' : 'Luu thay doi'}
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
                  className="h-11 rounded-lg border border-neutral-200 px-5 text-sm font-black text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
                >
                  Huy
                </button>
              </div>
            </form>
          ) : (
            <>
              {(profileMessage || profileError) && (
                <p className={`mt-5 text-sm font-semibold ${profileError ? 'text-red-600' : 'text-emerald-700'}`}>
                  {profileError || profileMessage}
                </p>
              )}
              <div className="mt-6 grid overflow-hidden rounded-xl border border-neutral-100 sm:grid-cols-2">
                {profileFields.map((field) => {
                  const Icon = field.icon
                  return (
                    <div key={field.label} className="flex gap-4 border-b border-neutral-100 p-5 even:sm:border-l">
                      <Icon className="mt-1 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.8} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-500">{field.label}</p>
                        <p className="mt-1 break-words text-sm font-black text-neutral-950">{field.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_18px_50px_rgba(2,44,34,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-2xl font-black text-neutral-950">Dia chi giao hang</h2>
                <p className="mt-1 text-sm text-neutral-500">Quan ly dia chi nhan hang cua ban.</p>
              </div>
            </div>
            <Link to="/account/addresses/new" className="inline-flex h-11 items-center rounded-lg border border-emerald-200 px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50">
              Quan ly dia chi
            </Link>
          </div>

          {isLoadingAddresses ? (
            <p className="mt-6 text-sm text-neutral-500">Dang tai dia chi...</p>
          ) : addressError ? (
            <p className="mt-6 text-sm font-semibold text-red-600">{addressError}</p>
          ) : addresses.length ? (
            <div className="mt-6 grid gap-4">
              {addresses.map((address) => (
                <div key={address.id} className={`rounded-xl border p-4 ${address?.isDefault ? 'border-emerald-300 bg-emerald-50/60' : 'border-neutral-100 bg-white'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-emerald-950">{address.receiverName}</h3>
                        {address?.isDefault && <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-xs font-black text-white">Mac dinh</span>}
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{address.receiverPhone}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">{formatFullAddress(address)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id)}
                        disabled={deletingAddressId === address.id}
                        className="h-9 rounded-lg border border-red-100 px-3 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingAddressId === address.id ? 'Dang xoa...' : 'Xoa'}
                      </button>
                      <Link to={`/account/addresses/${address.id}`} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-black text-emerald-700 hover:bg-emerald-50">
                        Chi tiet
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50 p-8 text-center sm:flex-row sm:gap-6 sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Home className="h-10 w-10" />
              </div>
              <div>
                <p className="font-black text-neutral-950">Ban chua co dia chi giao hang nao</p>
                <p className="mt-2 text-sm text-neutral-500">Them dia chi de viec mua sam thuan tien hon.</p>
                <Link to="/account/addresses/new" className="mt-4 inline-flex h-10 items-center rounded-lg bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-900">
                  Them dia chi moi
                </Link>
              </div>
            </div>
          )}

          {defaultAddress && (
            <div className="mt-5 rounded-xl bg-emerald-900 px-4 py-3 text-sm text-white">
              Dia chi mac dinh: <span className="font-semibold">{formatFullAddress(defaultAddress)}</span>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_18px_50px_rgba(2,44,34,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-1 h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-2xl font-black text-neutral-950">Phuong thuc thanh toan</h2>
                <p className="mt-1 text-sm text-neutral-500">Quan ly cac phuong thuc thanh toan da luu.</p>
              </div>
            </div>
            <button className="h-11 rounded-lg border border-emerald-200 px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50">
              Quan ly the
            </button>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
            Ban chua luu phuong thuc thanh toan nao. Ban van co the thanh toan COD hoac online khi dat hang.
          </div>
        </section>
      </div>
    </div>
  )
}

export default Account
