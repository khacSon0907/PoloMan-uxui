import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { addressApi, findLocationOption, useLocationOptions } from '../features/user'
import { getApiMessage, tokenStorage } from '../shared/api'

function getDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || ''
}

function getUserId(user) {
  return user?.id || user?.userId || user?._id || user?.sub || ''
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

function getAddressForm(address, user) {
  return {
    receiverName: address?.receiverName || getDisplayName(user),
    receiverPhone: address?.receiverPhone || user?.phoneNumber || '',
    streetAddress: address?.streetAddress || '',
    provinceCode: address?.provinceCode || '',
    provinceName: getAddressName(address, 'province'),
    districtCode: address?.districtCode || '',
    districtName: getAddressName(address, 'district'),
    wardCode: address?.wardCode || '',
    wardName: getAddressName(address, 'ward'),
    isDefault: Boolean(address?.isDefault),
  }
}

function getAddressPayload(values) {
  return {
    receiverName: values.receiverName.trim(),
    receiverPhone: values.receiverPhone.trim(),
    provinceCode: values.provinceCode,
    districtCode: values.districtCode,
    wardCode: values.wardCode,
    provinceName: values.provinceName,
    districtName: values.districtName,
    wardName: values.wardName,
    streetAddress: values.streetAddress.trim(),
    isDefault: Boolean(values.isDefault),
  }
}

function getAddressValidationError(values) {
  if (!values.receiverName.trim()) return 'Vui lòng nhập tên người nhận.'
  if (!values.receiverPhone.trim()) return 'Vui lòng nhập số điện thoại nhận hàng.'
  if (!values.provinceCode || !values.provinceName) return 'Vui lòng chọn tỉnh/thành phố.'
  if (!values.districtCode || !values.districtName) return 'Vui lòng chọn quận/huyện.'
  if (!values.wardCode || !values.wardName) return 'Vui lòng chọn phường/xã.'
  if (!values.streetAddress.trim()) return 'Vui lòng nhập số nhà, tên đường, ngõ, tòa nhà.'

  return ''
}

function AccountAddress() {
  const navigate = useNavigate()
  const { addressId, mode } = useParams()
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const user = authSnapshot.user
  const userId = getUserId(user)
  const isNew = !addressId || addressId === 'new'
  const isEditing = isNew || mode === 'edit'
  const [address, setAddress] = useState(null)
  const [form, setForm] = useState(() => getAddressForm(null, tokenStorage.getUser()))
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const {
    provinces,
    districts,
    wards,
    isLoadingProvinces,
    isLoadingDistricts,
    isLoadingWards,
    error: locationError,
  } = useLocationOptions(form.provinceCode, form.districtCode)

  const title = useMemo(() => {
    if (isNew) return 'Thêm địa chỉ mới'
    if (isEditing) return 'Cập nhật địa chỉ'
    return 'Chi tiết địa chỉ'
  }, [isEditing, isNew])

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    let isMounted = true

    if (!userId || isNew) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setAddress(null)
        setForm(getAddressForm(null, user))
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setError('')
      setMessage('')
    })

    addressApi
      .getAddress(userId, addressId)
      .then((result) => {
        if (!isMounted) return
        setAddress(result)
        setForm(getAddressForm(result, user))
      })
      .catch((requestError) => {
        if (isMounted) setError(getApiMessage(requestError, 'Không thể tải địa chỉ.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [addressId, isNew, user, userId])

  useEffect(() => {
    if (form.provinceCode || !form.provinceName || !provinces.length) return
    const province = findLocationOption(provinces, form.provinceName)
    if (!province?.code) return

    Promise.resolve().then(() => {
      setForm((current) => ({
        ...current,
        provinceCode: current.provinceCode || province.code,
        provinceName: current.provinceName || province.name,
      }))
    })
  }, [form.provinceCode, form.provinceName, provinces])

  useEffect(() => {
    if (form.districtCode || !form.districtName || !districts.length) return
    const district = findLocationOption(districts, form.districtName)
    if (!district?.code) return

    Promise.resolve().then(() => {
      setForm((current) => ({
        ...current,
        districtCode: current.districtCode || district.code,
        districtName: current.districtName || district.name,
      }))
    })
  }, [districts, form.districtCode, form.districtName])

  useEffect(() => {
    if (form.wardCode || !form.wardName || !wards.length) return
    const ward = findLocationOption(wards, form.wardName)
    if (!ward?.code) return

    Promise.resolve().then(() => {
      setForm((current) => ({
        ...current,
        wardCode: current.wardCode || ward.code,
        wardName: current.wardName || ward.name,
      }))
    })
  }, [form.wardCode, form.wardName, wards])

  const handleFieldChange = (event) => {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleLocationChange = (event) => {
    const { name, value } = event.target

    setForm((current) => {
      if (name === 'provinceCode') {
        const province = findLocationOption(provinces, value)

        return {
          ...current,
          provinceCode: province?.code || '',
          provinceName: province?.name || '',
          districtCode: '',
          districtName: '',
          wardCode: '',
          wardName: '',
        }
      }

      if (name === 'districtCode') {
        const district = findLocationOption(districts, value)

        return {
          ...current,
          districtCode: district?.code || '',
          districtName: district?.name || '',
          wardCode: '',
          wardName: '',
        }
      }

      const ward = findLocationOption(wards, value)

      return {
        ...current,
        wardCode: ward?.code || '',
        wardName: ward?.name || '',
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!userId) {
      setError('Không tìm thấy tài khoản để lưu địa chỉ.')
      return
    }

    const validationError = getAddressValidationError(form)

    if (validationError) {
      setError(validationError)
      setMessage('')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = getAddressPayload(form)
      const savedAddress = isNew
        ? await addressApi.createAddress(userId, payload)
        : await addressApi.updateAddress(userId, addressId, payload)

      const nextAddress = savedAddress?.id
        ? await addressApi.getAddress(userId, savedAddress.id).catch(() => savedAddress)
        : savedAddress

      setAddress(nextAddress)
      setForm(getAddressForm(nextAddress, user))
      tokenStorage.setUser({ ...tokenStorage.getUser(), address: nextAddress })
      setMessage(isNew ? 'Đã thêm địa chỉ mới.' : 'Đã cập nhật địa chỉ.')

      if (isNew && nextAddress?.id) {
        navigate(`/account/addresses/${nextAddress.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể lưu địa chỉ.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!authSnapshot.isAuthenticated && !authSnapshot.isInitializing) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-emerald-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Địa chỉ giao hàng</p>
            <h1 className="mt-2 text-2xl font-semibold text-emerald-800">{title}</h1>
            <p className="mt-1 text-sm text-emerald-600">
              {isEditing ? 'Nhập đầy đủ thông tin người nhận và khu vực giao hàng.' : 'Thông tin chi tiết của địa chỉ đã lưu.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/account"
              className="h-10 rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
            >
              Quay lại profile
            </Link>
            {!isNew && !isEditing && (
              <Link
                to={`/account/addresses/${addressId}/edit`}
                className="h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Sửa địa chỉ
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="mt-5 text-sm text-emerald-600">Đang tải địa chỉ...</p>
        ) : !isEditing ? (
          <div className="mt-5 grid gap-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            {address && (
              <>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-emerald-900">{address.receiverName}</h2>
                    {address.isDefault && (
                      <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">Mặc định</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-emerald-800">{address.receiverPhone}</p>
                  <p className="mt-3 break-words text-sm text-emerald-900/75">{formatFullAddress(address)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-500">Tỉnh/thành phố</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-900">{getAddressName(address, 'province')}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-500">Quận/huyện</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-900">{getAddressName(address, 'district')}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-500">Phường/xã</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-900">{getAddressName(address, 'ward')}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-emerald-700">Tên người nhận</span>
                <input
                  name="receiverName"
                  value={form.receiverName}
                  onChange={handleFieldChange}
                  disabled={isSaving}
                  className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-emerald-700">Số điện thoại nhận hàng</span>
                <input
                  name="receiverPhone"
                  value={form.receiverPhone}
                  onChange={handleFieldChange}
                  disabled={isSaving}
                  className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <select
                name="provinceCode"
                value={form.provinceCode}
                onChange={handleLocationChange}
                disabled={isSaving || isLoadingProvinces}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
              >
                <option value="">{isLoadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố'}</option>
                {provinces.map((province) => (
                  <option key={province.value} value={province.code}>
                    {province.label}
                  </option>
                ))}
              </select>
              <select
                name="districtCode"
                value={form.districtCode}
                onChange={handleLocationChange}
                disabled={isSaving || !form.provinceCode || isLoadingDistricts}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
              >
                <option value="">{isLoadingDistricts ? 'Đang tải...' : 'Chọn quận/huyện'}</option>
                {districts.map((district) => (
                  <option key={district.value} value={district.code}>
                    {district.label}
                  </option>
                ))}
              </select>
              <select
                name="wardCode"
                value={form.wardCode}
                onChange={handleLocationChange}
                disabled={isSaving || !form.districtCode || isLoadingWards}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
              >
                <option value="">{isLoadingWards ? 'Đang tải...' : 'Chọn phường/xã'}</option>
                {wards.map((ward) => (
                  <option key={ward.value} value={ward.code}>
                    {ward.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-emerald-700">Số nhà, tên đường, ngõ, tòa nhà...</span>
              <input
                name="streetAddress"
                value={form.streetAddress}
                onChange={handleFieldChange}
                disabled={isSaving}
                className="h-11 rounded-md border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-emerald-50/60"
                placeholder="Số nhà, tên đường, ngõ, tòa nhà..."
              />
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-emerald-50/70 px-3 py-3 text-sm font-medium text-emerald-800">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleFieldChange}
                disabled={isSaving}
                className="h-4 w-4 accent-emerald-700"
              />
              Đặt làm địa chỉ mặc định
            </label>
            {(message || error || locationError) && (
              <p className={`text-sm ${error || locationError ? 'text-red-500' : 'text-emerald-600'}`}>
                {error || locationError || message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : isNew ? 'Lưu địa chỉ' : 'Cập nhật địa chỉ'}
              </button>
              {!isNew && (
                <Link
                  to={`/account/addresses/${addressId}`}
                  className="h-11 rounded-md border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 hover:border-emerald-500"
                >
                  Hủy
                </Link>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AccountAddress
