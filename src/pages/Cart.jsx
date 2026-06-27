import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Heart, Lock, PackageCheck, ShieldCheck, Trash2, Truck } from 'lucide-react'

import {
  cartApi,
  cartStorage,
  CART_UPDATED_EVENT,
  formatCurrency,
  getUserId,
  normalizeCartItems,
} from '../features/product'
import { orderApi } from '../features/order'
import { addressApi, findLocationOption, userApi, useLocationOptions } from '../features/user'
import { calculateShippingFee, getFreeShippingProgress, shippingRuleApi } from '../features/shippingRule'
import { getApiMessage, tokenStorage } from '../shared/api'
import { usePageMeta } from '../shared/hooks/usePageMeta'

const initialCheckoutForm = {
  addressId: '',
  guestEmail: '',
  guestUsername: '',
  fullName: '',
  phoneNumber: '',
  address: '',
  provinceCode: '',
  province: '',
  districtCode: '',
  district: '',
  wardCode: '',
  ward: '',
  note: '',
}

const paymentMethods = [
  {
    value: 'COD',
    label: 'COD',
    title: 'Thanh toan khi nhan hang',
    description: 'Tra tien mat cho shipper sau khi nhan va kiem tra san pham.',
    tag: 'Ship COD',
  },
  {
    value: 'PAYOS',
    label: 'Bank',
    title: 'Thanh toan ngan hang',
    description: 'Quet ma QR PayOS bang app ngan hang, he thong tu dong xac nhan.',
    tag: 'QR ngan hang',
  },
]

const BUY_NOW_STORAGE_KEY = 'poloman:buy-now-checkout'

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.username || user?.email || ''
}

function getUserAddress(user) {
  if (typeof user?.address === 'string') return user.address

  return (
    user?.streetAddress ||
    user?.address?.streetAddress ||
    user?.address?.detail ||
    user?.address?.street ||
    user?.shippingAddress ||
    user?.defaultAddress ||
    ''
  )
}

function getCheckoutForm(user) {
  return {
    addressId: '',
    guestEmail: '',
    guestUsername: '',
    fullName: getDisplayName(user),
    phoneNumber: user?.phoneNumber || user?.phone || '',
    address: getUserAddress(user),
    provinceCode: user?.provinceCode || user?.address?.provinceCode || '',
    province: user?.province || user?.provinceName || user?.address?.province || user?.address?.provinceName || '',
    districtCode: user?.districtCode || user?.address?.districtCode || '',
    district: user?.district || user?.districtName || user?.address?.district || user?.address?.districtName || '',
    wardCode: user?.wardCode || user?.address?.wardCode || '',
    ward: user?.ward || user?.wardName || user?.address?.ward || user?.address?.wardName || '',
    note: '',
  }
}

function getCheckoutFormFromAddress(address, fallbackUser) {
  return {
    addressId: address?.id || '',
    guestEmail: '',
    guestUsername: '',
    fullName: address?.receiverName || getDisplayName(fallbackUser),
    phoneNumber: address?.receiverPhone || fallbackUser?.phoneNumber || fallbackUser?.phone || '',
    address: address?.streetAddress || address?.address || '',
    provinceCode: address?.provinceCode || '',
    province: address?.provinceName || address?.province || '',
    districtCode: address?.districtCode || '',
    district: address?.districtName || address?.district || '',
    wardCode: address?.wardCode || '',
    ward: address?.wardName || address?.ward || '',
    note: '',
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function getAddressValidationError(values, { isGuest = false } = {}) {
  if (isGuest && !isValidEmail(values.guestEmail)) return 'Vui long nhap email dung dinh dang.'
  if (isGuest && !values.guestUsername.trim()) return 'Vui long nhap ho ten khach hang.'
  if (!values.fullName.trim()) return 'Vui long nhap ho ten nguoi nhan.'
  if (!values.phoneNumber.trim()) return 'Vui long nhap so dien thoai nguoi nhan.'
  if (!values.provinceCode || !values.province) return 'Vui long chon tinh/thanh pho.'
  if (!values.districtCode || !values.district) return 'Vui long chon quan/huyen.'
  if (!values.wardCode || !values.ward) return 'Vui long chon phuong/xa.'
  if (!values.address.trim()) return 'Vui long nhap so nha, ten duong, ngo, toa nha.'

  return ''
}

function getCreateAddressPayload(values) {
  return {
    receiverName: values.fullName.trim(),
    receiverPhone: values.phoneNumber.trim(),
    provinceCode: values.provinceCode,
    districtCode: values.districtCode,
    wardCode: values.wardCode,
    provinceName: values.province,
    districtName: values.district,
    wardName: values.ward,
    streetAddress: values.address.trim(),
    isDefault: true,
  }
}

function getReceiverAddress(values) {
  return [values.ward, values.district, values.province, values.address]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
}

function getPaymentUrl(order) {
  return order?.payment?.checkoutUrl || order?.payment?.paymentUrl || order?.checkoutUrl || order?.paymentUrl || ''
}

function hasPayosPayment(order) {
  return Boolean(order?.payment?.qrCode || getPaymentUrl(order))
}

function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function LocationCombobox({
  disabled,
  isLoading,
  name,
  onChange,
  options,
  placeholder,
  value,
}) {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = useMemo(() => findLocationOption(options, value), [options, value])
  const [query, setQuery] = useState(selectedOption?.label || '')
  const inputValue = isOpen ? query : selectedOption?.label || ''

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query)

    if (!normalizedQuery) return options

    return options.filter((option) => normalizeSearchValue(option.label).includes(normalizedQuery))
  }, [options, query])

  const handleSelect = (option) => {
    onChange(name, option.code)
    setQuery(option.label)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (!disabled) {
            setQuery(selectedOption?.label || '')
            setIsOpen(true)
          }
        }}
        disabled={disabled}
        placeholder={isLoading ? 'Dang tai...' : placeholder}
        className="h-12 w-full rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 pr-10 text-sm outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
        autoComplete="off"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-700">⌄</span>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-emerald-100 bg-white py-1 shadow-lg">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 ${
                  option.code === value ? 'bg-emerald-800 text-white hover:bg-emerald-800' : 'text-emerald-950'
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-2 text-sm text-emerald-700">Khong tim thay dia chi</p>
          )}
        </div>
      )}
    </div>
  )
}

function getCreateOrderItems(items) {
  return items.map((item) => ({
    productId: item.productId || '',
    productName: item.name || item.productName || '',
    productImage: item.image || item.productImage || '',
    colorId: item.colorId || '',
    colorName: item.colorName || '',
    sizeId: item.sizeId || '',
    sizeName: item.size || item.sizeName || '',
    quantity: Number(item.quantity || 1),
  }))
}

function getCartLineKey(item) {
  return [item?.productId || '', item?.colorId || item?.colorName || '', item?.sizeId || item?.size || ''].join('|')
}

function readBuyNowCheckoutItem() {
  try {
    const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const item = parsed?.item

    if (!item?.productId) return null

    return {
      ...item,
      quantity: Math.max(1, Number(item.quantity || 1)),
    }
  } catch {
    return null
  }
}

function Cart() {
  const navigate = useNavigate()
  const location = useLocation()
  const isBuyNowCheckout = new URLSearchParams(location.search).get('mode') === 'buy-now'
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [items, setItems] = useState(() => (isBuyNowCheckout ? [readBuyNowCheckoutItem()].filter(Boolean) : cartStorage.getItems()))
  const [selectedIndexes, setSelectedIndexes] = useState(() => {
    const initial = isBuyNowCheckout ? [readBuyNowCheckoutItem()].filter(Boolean) : cartStorage.getItems()
    return new Set(initial.map((_, i) => i))
  })
  const [checkoutForm, setCheckoutForm] = useState(() => getCheckoutForm(tokenStorage.getUser()))
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [profileMessage, setProfileMessage] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [shippingRule, setShippingRule] = useState(null)
  const [isLoadingShippingRule, setIsLoadingShippingRule] = useState(true)
  const [pendingRemoveItem, setPendingRemoveItem] = useState(null)
  const [isRemovingItem, setIsRemovingItem] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [addresses, setAddresses] = useState([])
  const user = authSnapshot.user
  const userId = getUserId(user)
  const isAuthenticated = authSnapshot.isAuthenticated
  const isAuthInitializing = authSnapshot.isInitializing
  const {
    provinces,
    districts,
    wards,
    isLoadingProvinces,
    isLoadingDistricts,
    isLoadingWards,
    error: locationError,
  } = useLocationOptions(checkoutForm.provinceCode, checkoutForm.districtCode)

  usePageMeta({
    title: 'Gio hang cua ban | PoloMan',
    description: 'Kiem tra gio hang va thong tin giao hang.',
    canonicalPath: '/cart',
  })

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(() => {
    const syncCart = async () => {
      if (isBuyNowCheckout) {
        const buyNowItem = readBuyNowCheckoutItem()
        const next = buyNowItem ? [buyNowItem] : []
        setItems(next)
        setSelectedIndexes(new Set(next.map((_, i) => i)))
        return
      }

      if (isAuthInitializing || (isAuthenticated && !userId)) {
        return
      }

      if (!userId) {
        const next = cartStorage.getItems()
        setItems(next)
        setSelectedIndexes(new Set(next.map((_, i) => i)))
        return
      }

      try {
        const cart = await cartApi.getCart(userId)
        const next = normalizeCartItems(cart)
        setItems(next)
        setSelectedIndexes(new Set(next.map((_, i) => i)))
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(getApiMessage(error, 'Khong the tai gio hang.'))
      }
    }

    syncCart()

    window.addEventListener(CART_UPDATED_EVENT, syncCart)
    window.addEventListener('storage', syncCart)

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [isAuthInitializing, isAuthenticated, isBuyNowCheckout, userId])

  useEffect(() => {
    let isMounted = true

    if (isAuthInitializing) {
      return () => {
        isMounted = false
      }
    }

    if (!isAuthenticated) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setCheckoutForm((current) => ({ ...initialCheckoutForm, note: current.note }))
        setProfileMessage('')
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoadingProfile(true)
      setProfileMessage('')
    })

    userApi
      .getMe()
      .then((user) => {
        if (!isMounted) return

        tokenStorage.setUser(user)
        setCheckoutForm((current) => ({
          ...getCheckoutForm(user),
          note: current.note,
        }))
        setProfileMessage('Da dien thong tin tu tai khoan cua ban.')
      })
      .catch((error) => {
        if (isMounted) {
          setProfileMessage(getApiMessage(error, 'Khong the tai thong tin tai khoan.'))
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false)
      })

    return () => {
      isMounted = false
    }
  }, [isAuthInitializing, isAuthenticated])

  useEffect(() => {
    let isMounted = true

    shippingRuleApi
      .getActive()
      .then((rule) => {
        if (isMounted) setShippingRule(rule)
      })
      .catch(() => {
        if (isMounted) setShippingRule(null)
      })
      .finally(() => {
        if (isMounted) setIsLoadingShippingRule(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

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

    addressApi
      .getAddresses(userId)
      .then((list) => {
        if (!isMounted) return

        setAddresses(list)

        const defaultAddress = list.find((address) => address?.isDefault) || list[0]
        if (!defaultAddress) return

        setCheckoutForm((current) => ({
          ...getCheckoutFormFromAddress(defaultAddress, user),
          note: current.note,
        }))
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai danh sach dia chi.'))
      })

    return () => {
      isMounted = false
    }
  }, [userId, user])

  const handleCheckoutFieldChange = (event) => {
    const { name, value } = event.target
    setOrderSuccess(null)
    setCheckoutForm((current) => ({ ...current, [name]: value }))
  }

  const handleSavedAddressChange = (event) => {
    const addressId = event.target.value
    const selectedAddress = addresses.find((address) => address?.id === addressId)

    if (!selectedAddress) {
      setCheckoutForm((current) => ({
        ...current,
        addressId: '',
        fullName: getDisplayName(user),
        phoneNumber: user?.phoneNumber || user?.phone || '',
        address: '',
        provinceCode: '',
        province: '',
        districtCode: '',
        district: '',
        wardCode: '',
        ward: '',
      }))
      return
    }

    setCheckoutForm((current) => ({
      ...getCheckoutFormFromAddress(selectedAddress, user),
      note: current.note,
    }))
  }

  const handleCheckoutLocationChange = (name, value) => {
    setCheckoutForm((current) => {
      if (name === 'provinceCode') {
        const province = findLocationOption(provinces, value)

        return {
          ...current,
          addressId: '',
          provinceCode: province?.code || '',
          province: province?.name || '',
          districtCode: '',
          district: '',
          wardCode: '',
          ward: '',
        }
      }

      if (name === 'districtCode') {
        const district = findLocationOption(districts, value)

        return {
          ...current,
          addressId: '',
          districtCode: district?.code || '',
          district: district?.name || '',
          wardCode: '',
          ward: '',
        }
      }

      const ward = findLocationOption(wards, value)

      return {
        ...current,
        addressId: '',
        wardCode: ward?.code || '',
        ward: ward?.name || '',
      }
    })
  }

  useEffect(() => {
    if (checkoutForm.provinceCode || !checkoutForm.province || !provinces.length) return

    const province = findLocationOption(provinces, checkoutForm.province)
    if (!province?.code) return

    Promise.resolve().then(() => {
      setCheckoutForm((current) => ({
        ...current,
        provinceCode: current.provinceCode || province.code,
        province: current.province || province.name,
      }))
    })
  }, [checkoutForm.province, checkoutForm.provinceCode, provinces])

  useEffect(() => {
    if (checkoutForm.districtCode || !checkoutForm.district || !districts.length) return

    const district = findLocationOption(districts, checkoutForm.district)
    if (!district?.code) return

    Promise.resolve().then(() => {
      setCheckoutForm((current) => ({
        ...current,
        districtCode: current.districtCode || district.code,
        district: current.district || district.name,
      }))
    })
  }, [checkoutForm.district, checkoutForm.districtCode, districts])

  useEffect(() => {
    if (checkoutForm.wardCode || !checkoutForm.ward || !wards.length) return

    const ward = findLocationOption(wards, checkoutForm.ward)
    if (!ward?.code) return

    Promise.resolve().then(() => {
      setCheckoutForm((current) => ({
        ...current,
        wardCode: current.wardCode || ward.code,
        ward: current.ward || ward.name,
      }))
    })
  }, [checkoutForm.ward, checkoutForm.wardCode, wards])

  const selectedItems = useMemo(() => items.filter((_, i) => selectedIndexes.has(i)), [items, selectedIndexes])
  const isAllSelected = items.length > 0 && selectedItems.length === items.length
  const isPartialSelected = selectedItems.length > 0 && selectedItems.length < items.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIndexes(new Set())
    } else {
      setSelectedIndexes(new Set(items.map((_, i) => i)))
    }
  }

  const handleToggleSelectItem = (index) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [selectedItems],
  )
  const shippingFee = calculateShippingFee(shippingRule, subtotal)
  const freeShippingGap = getFreeShippingProgress(shippingRule, subtotal)
  const discount = subtotal >= 799000 ? 50000 : subtotal >= 499000 ? 20000 : 0
  const total = Math.max(0, subtotal + shippingFee - discount)

  const handleQuantityChange = async (index, quantity) => {
    const item = items[index]
    const nextQuantity = Math.max(1, Number(quantity || 1))

    if (!item) return

    if (isBuyNowCheckout) {
      const nextItem = { ...item, quantity: nextQuantity }
      sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify({ item: nextItem }))
      setItems([nextItem])
      return
    }

    if (!userId) {
      cartStorage.updateQuantity(index, nextQuantity)
      setItems(cartStorage.getItems())
      return
    }

    try {
      const cart = await cartApi.updateItem(userId, item.productId, {
        productId: item.productId,
        colorId: item.colorId,
        sizeId: item.sizeId,
        quantity: nextQuantity,
      })
      setItems(normalizeCartItems(cart))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the cap nhat gio hang.'))
    }
  }

  const handleRemove = (index) => {
    const item = items[index]

    if (!item) return

    if (isBuyNowCheckout) {
      setPendingRemoveItem({ item, index })
      setErrorMessage('')
      return
    }

    setPendingRemoveItem({ item, index })
    setErrorMessage('')
  }

  const closeRemoveConfirm = () => {
    if (isRemovingItem) return
    setPendingRemoveItem(null)
  }

  const handleConfirmRemove = async () => {
    const removeTarget = pendingRemoveItem
    const item = removeTarget?.item
    const index = removeTarget?.index

    if (!item || index === undefined) return

    setIsRemovingItem(true)
    setErrorMessage('')

    if (isBuyNowCheckout) {
      sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
      setItems([])
      setPendingRemoveItem(null)
      setIsRemovingItem(false)
      return
    }

    if (!userId) {
      cartStorage.removeItem(index)
      setItems(cartStorage.getItems())
      setPendingRemoveItem(null)
      setIsRemovingItem(false)
      return
    }

    try {
      const expectedRemainingItems = items.filter((_, itemIndex) => itemIndex !== index)
      const cart = await cartApi.removeItem(userId, item.productId, {
        cartItemId: item.cartItemId,
        colorId: item.colorId,
        sizeId: item.sizeId,
      })
      let nextItems = normalizeCartItems(cart)
      const nextItemKeys = new Set(nextItems.map(getCartLineKey))
      const missingItems = expectedRemainingItems.filter((remainingItem) => !nextItemKeys.has(getCartLineKey(remainingItem)))

      if (missingItems.length) {
        for (const missingItem of missingItems) {
          const recoveredCart = await cartApi.addItem(userId, {
            productId: missingItem.productId,
            productName: missingItem.name,
            productImage: missingItem.image,
            colorId: missingItem.colorId,
            colorName: missingItem.colorName,
            sizeId: missingItem.sizeId,
            sizeName: missingItem.size,
            quantity: missingItem.quantity,
          })
          nextItems = normalizeCartItems(recoveredCart)
        }
      }

      setItems(nextItems)
      setPendingRemoveItem(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the xoa san pham khoi gio hang.'))
    } finally {
      setIsRemovingItem(false)
    }
  }

  const handleClearCart = async () => {
    if (!items.length) return

    setErrorMessage('')

    if (isBuyNowCheckout) {
      sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
      setItems([])
      return
    }

    if (!userId) {
      cartStorage.clear()
      setItems([])
      return
    }

    try {
      await cartApi.clearCart(userId)
      cartStorage.clear()
      setItems([])
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the xoa gio hang.'))
    }
  }

  const handleCheckout = async () => {
    if (!selectedItems.length) {
      setErrorMessage('Vui long chon it nhat mot san pham de dat hang.')
      return
    }

    if (isLoadingShippingRule) {
      setErrorMessage('Dang tinh phi van chuyen, vui long thu lai sau giay lat.')
      return
    }

    const selectedPaymentMethod = paymentMethods.find((method) => method.value === paymentMethod) || paymentMethods[0]
    const isGuestCheckout = !userId
    const checkoutItems = selectedItems
    const validationError = getAddressValidationError(checkoutForm, { isGuest: isGuestCheckout })

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsCheckingOut(true)
    setErrorMessage('')
    setProfileMessage('')
    setOrderSuccess(null)

    try {
      if (isGuestCheckout) {
        const createdOrder = await orderApi.createOrder({
          guest: {
            email: checkoutForm.guestEmail.trim(),
            username: checkoutForm.guestUsername.trim(),
          },
          receiverName: checkoutForm.fullName.trim(),
          receiverPhone: checkoutForm.phoneNumber.trim(),
          receiverAddress: getReceiverAddress(checkoutForm),
          items: getCreateOrderItems(checkoutItems),
          discountAmount: discount,
          paymentMethod: selectedPaymentMethod.value,
          note: checkoutForm.note.trim(),
        })

        const paymentUrl = getPaymentUrl(createdOrder)

        if (isBuyNowCheckout) {
          sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
        } else {
          cartStorage.clear()
        }
        setItems([])
        setSelectedIndexes(new Set())

        if (selectedPaymentMethod.value === 'PAYOS' && hasPayosPayment(createdOrder)) {
          const paymentPayload = {
            order: createdOrder,
            items: checkoutItems,
          }

          sessionStorage.setItem('poloman:checkout-payment', JSON.stringify(paymentPayload))

          if (createdOrder?.payment?.qrCode) {
            navigate('/checkout/payment', {
              replace: true,
              state: paymentPayload,
            })
            return
          }

          window.location.assign(paymentUrl)
          return
        }

        setOrderSuccess({
          orderCode: createdOrder?.orderCode || createdOrder?.id || '',
          email: checkoutForm.guestEmail.trim(),
        })
        setCheckoutForm((current) => ({
          ...initialCheckoutForm,
          guestEmail: current.guestEmail,
          guestUsername: current.guestUsername,
        }))
        return
      }

      const savedAddress = checkoutForm.addressId
        ? await addressApi.updateAddress(userId, checkoutForm.addressId, getCreateAddressPayload(checkoutForm))
        : await addressApi.createAddress(userId, getCreateAddressPayload(checkoutForm))
      const syncedAddress = savedAddress?.id
        ? await addressApi.getAddress(userId, savedAddress.id).catch(() => savedAddress)
        : savedAddress
      const latestAddresses = await addressApi.getAddresses(userId).catch(() => [])

      if (latestAddresses.length) setAddresses(latestAddresses)

      tokenStorage.setUser({
        ...user,
        address: syncedAddress || {
          streetAddress: checkoutForm.address.trim(),
          provinceCode: checkoutForm.provinceCode,
          districtCode: checkoutForm.districtCode,
          wardCode: checkoutForm.wardCode,
          provinceName: checkoutForm.province,
          districtName: checkoutForm.district,
          wardName: checkoutForm.ward,
        },
      })
      setCheckoutForm((current) => ({
        ...current,
        addressId: syncedAddress?.id || current.addressId,
      }))
      const createdOrder = await orderApi.createOrder({
        userId,
        receiverName: checkoutForm.fullName.trim(),
        receiverPhone: checkoutForm.phoneNumber.trim(),
        receiverAddress: getReceiverAddress(checkoutForm),
        items: getCreateOrderItems(checkoutItems),
        discountAmount: discount,
        paymentMethod: selectedPaymentMethod.value,
        note: checkoutForm.note.trim(),
      })

      if (isBuyNowCheckout) {
        sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
      } else {
        await cartApi.clearCart(userId).catch(() => null)
        cartStorage.clear()
      }
      setItems([])
      setSelectedIndexes(new Set())

      if (selectedPaymentMethod.value === 'PAYOS' && hasPayosPayment(createdOrder)) {
        const paymentPayload = {
          order: createdOrder,
          items: Array.isArray(createdOrder?.items) && createdOrder.items.length ? createdOrder.items : checkoutItems,
        }

        sessionStorage.setItem('poloman:checkout-payment', JSON.stringify(paymentPayload))

        if (!createdOrder?.payment?.qrCode && getPaymentUrl(createdOrder)) {
          window.location.assign(getPaymentUrl(createdOrder))
          return
        }

        navigate('/checkout/payment', {
          replace: true,
          state: paymentPayload,
        })
        return
      }

      navigate('/account/orders', {
        state: {
          message: `Dat hang thanh cong${createdOrder?.orderCode ? `: ${createdOrder.orderCode}` : ''}.`,
        },
      })
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tao don hang.'))
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="space-y-7 bg-[radial-gradient(circle_at_top_left,#f5fbf4_0%,#ffffff_42%,#f7faf7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-emerald-900">
          San pham
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">Gio hang</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 sm:text-4xl">
            {isBuyNowCheckout ? 'Thanh toan ngay' : 'Gio hang'}
          </h1>
          <p className="mt-3 text-sm text-emerald-900/65">
            {items.length} san pham trong don hang
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800">
          <ShieldCheck className="h-5 w-5" />
          Mua sam an tam 100% chinh hang
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_16px_45px_rgba(15,76,58,0.08)] sm:p-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-5">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                aria-label={isAllSelected ? 'Bo chon tat ca' : 'Chon tat ca'}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  isAllSelected
                    ? 'border-emerald-800 bg-emerald-800 text-white'
                    : isPartialSelected
                      ? 'border-emerald-800 bg-emerald-800/20 text-emerald-800'
                      : 'border-emerald-300 bg-white text-transparent hover:border-emerald-600'
                }`}
              >
                {isAllSelected ? (
                  <Check className="h-4 w-4" />
                ) : isPartialSelected ? (
                  <span className="block h-0.5 w-3 rounded bg-emerald-800" />
                ) : null}
              </button>
              <span className="text-sm font-black text-emerald-900">
                Chon tat ca ({selectedItems.length}/{items.length})
              </span>
            </div>

            {items.length ? (
              <div className="mt-5">
                <div className="hidden grid-cols-[minmax(280px,1fr)_140px_150px_150px] px-4 pb-4 text-center text-sm text-emerald-950 lg:grid">
                  <span className="text-left pl-24">San pham</span>
                  <span>Don gia</span>
                  <span>So luong</span>
                  <span>Thanh tien</span>
                </div>

                <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={`${item.productId}-${item.colorName}-${item.size}-${index}`}
                    className="grid gap-4 rounded-xl border border-emerald-100 bg-white p-3 transition-shadow hover:shadow-[0_12px_30px_rgba(15,76,58,0.08)] lg:grid-cols-[minmax(280px,1fr)_140px_150px_150px] lg:items-center"
                  >
                    <div className="grid grid-cols-[28px_96px_minmax(0,1fr)] items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectItem(index)}
                        aria-label={selectedIndexes.has(index) ? 'Bo chon san pham' : 'Chon san pham'}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          selectedIndexes.has(index)
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-emerald-300 bg-white text-transparent hover:border-emerald-600'
                        }`}
                      >
                        {selectedIndexes.has(index) && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <div className="h-28 w-24 overflow-hidden rounded-xl bg-emerald-50">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-neutral-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          to={`/products/${item.slug || item.productId}`}
                          className="line-clamp-2 text-base font-black leading-6 text-emerald-950 hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-2 text-sm text-emerald-900/60">
                          {item.colorName ? `Mau: ${item.colorName}` : 'Mau: -'} <span className="mx-2">•</span>{' '}
                          {item.size ? `Size: ${item.size}` : 'Size: -'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-emerald-900/65">
                          <button type="button" className="inline-flex items-center gap-1.5 hover:text-emerald-800">
                            <Heart className="h-4 w-4" />
                            Yeu thich
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="inline-flex items-center gap-1.5 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xoa
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block lg:text-center">
                      <span className="text-sm font-bold text-emerald-900/50 lg:hidden">Don gia</span>
                      <span className="font-black text-emerald-950">{formatCurrency(Number(item.price || 0))}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:justify-center">
                      <span className="text-sm font-bold text-emerald-900/50 lg:hidden">So luong</span>
                      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-emerald-100 bg-white">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, Number(item.quantity || 1) - 1)}
                          className="h-full w-11 text-lg font-black text-emerald-900 hover:bg-emerald-50"
                          aria-label="Giam so luong"
                        >
                          -
                        </button>
                        <span className="min-w-10 text-center text-sm font-black text-emerald-950">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, Number(item.quantity || 1) + 1)}
                          className="h-full w-11 text-lg font-black text-emerald-900 hover:bg-emerald-50"
                          aria-label="Tang so luong"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
                      <span className="text-sm font-bold text-emerald-900/50 lg:hidden">Thanh tien</span>
                      <p className="text-lg font-black text-emerald-800">
                        {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                      </p>
                    </div>
                  </div>
                ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-xl bg-emerald-50/75 px-4 py-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {freeShippingGap > 0
                      ? `Ban con thieu ${formatCurrency(freeShippingGap)} de duoc mien phi van chuyen`
                      : 'Don hang duoc mien phi van chuyen'}
                  </span>
                  <Link to="/products" className="inline-flex items-center gap-2 font-bold underline-offset-4 hover:underline">
                    Xem them san pham
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/products" className="inline-flex h-11 items-center gap-2 text-sm font-black text-emerald-800 hover:text-emerald-950">
                    <ArrowLeft className="h-4 w-4" />
                    Tiep tuc mua sam
                  </Link>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-100 px-5 text-sm font-black text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xoa gio hang
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-black text-emerald-900">
                  0
                </div>
                <h3 className="mt-4 text-lg font-black text-emerald-950">
                  {isBuyNowCheckout ? 'Chua co san pham mua ngay' : 'Gio hang dang trong'}
                </h3>
                <Link
                  to="/products"
                  className="mt-5 inline-flex h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900"
                >
                  Mua sam ngay
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_16px_45px_rgba(15,76,58,0.08)] sm:p-6">
            <h2 className="text-xl font-black text-emerald-950">Thong tin giao hang</h2>
            <p className="mt-2 text-sm text-emerald-900/60">
              {isAuthenticated
                ? 'Thong tin giao hang duoc lay tu tai khoan va co the chinh sua.'
                : 'Nhap thong tin giao hang de hoan tat don hang.'}
            </p>
          </div>

          {isAuthenticated && (
            <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-emerald-950">Thong tin tai khoan</p>
                  <p className="mt-1 text-sm text-emerald-900/60">
                    {isLoadingProfile ? 'Dang tai thong tin...' : profileMessage || 'San sang giao hang cho tai khoan cua ban.'}
                  </p>
                </div>
                {isLoadingProfile && (
                  <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">Ho ten</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {checkoutForm.fullName || getDisplayName(user) || 'Chua cap nhat'}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">Email</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {user?.email || 'Chua cap nhat'}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/60">So dien thoai</p>
                  <p className="mt-1 truncate text-sm font-bold text-emerald-950">
                    {checkoutForm.phoneNumber || user?.phoneNumber || user?.phone || 'Chua cap nhat'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-sm">
            {isAuthenticated && (
              <select
                name="addressId"
                value={checkoutForm.addressId}
                onChange={handleSavedAddressChange}
                className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Nhap dia chi moi</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.isDefault ? 'Mac dinh - ' : ''}
                    {address.receiverName} - {address.streetAddress}, {address.wardName}, {address.districtName}, {address.provinceName}
                  </option>
                ))}
              </select>
            )}
            {!isAuthenticated && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="guestEmail"
                  type="email"
                  value={checkoutForm.guestEmail}
                  onChange={handleCheckoutFieldChange}
                  className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
                  placeholder="Email nhan hoa don"
                />
                <input
                  name="guestUsername"
                  value={checkoutForm.guestUsername}
                  onChange={handleCheckoutFieldChange}
                  className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
                  placeholder="Ho ten khach hang"
                />
              </div>
            )}
            <input
              name="fullName"
              value={checkoutForm.fullName}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder={isAuthenticated ? 'Ho va ten' : 'Ten nguoi nhan'}
            />
            <input
              name="phoneNumber"
              value={checkoutForm.phoneNumber}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="So dien thoai"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <LocationCombobox
                name="provinceCode"
                value={checkoutForm.provinceCode}
                onChange={handleCheckoutLocationChange}
                options={provinces}
                placeholder="Chon tinh/thanh pho"
                isLoading={isLoadingProvinces}
                disabled={isLoadingProvinces}
              />
              <LocationCombobox
                name="districtCode"
                value={checkoutForm.districtCode}
                onChange={handleCheckoutLocationChange}
                options={districts}
                placeholder="Chon quan/huyen"
                isLoading={isLoadingDistricts}
                disabled={!checkoutForm.provinceCode || isLoadingDistricts}
              />
              <LocationCombobox
                name="wardCode"
                value={checkoutForm.wardCode}
                onChange={handleCheckoutLocationChange}
                options={wards}
                placeholder="Chon phuong/xa"
                isLoading={isLoadingWards}
                disabled={!checkoutForm.districtCode || isLoadingWards}
              />
            </div>
            <input
              name="address"
              value={checkoutForm.address}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="So nha, ten duong, ngo, toa nha..."
            />
            {locationError && (
              <p className="text-sm font-semibold text-red-600">{locationError}</p>
            )}
            <input
              name="note"
              value={checkoutForm.note}
              onChange={handleCheckoutFieldChange}
              className="h-12 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 text-sm outline-none focus:border-emerald-600"
              placeholder="Ghi chu giao hang"
            />
          </div>

        </section>

        <aside className="space-y-5">
          {isBuyNowCheckout && items.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              Ban dang thanh toan rieng san pham nay, gio hang hien co se duoc giu nguyen.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </div>
          )}

          {orderSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold leading-6 text-emerald-800">
              <p className="text-base font-black text-emerald-950">
                Dat hang thanh cong{orderSuccess.orderCode ? `: #${orderSuccess.orderCode}` : ''}.
              </p>
              <p className="mt-1">Hoa don da duoc gui ve email {orderSuccess.email}.</p>
            </div>
          )}

          <div className="sticky bottom-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_16px_45px_rgba(15,76,58,0.08)]">
            <div className="mb-4 flex items-center justify-between border-b border-emerald-100 pb-4">
              <h2 className="text-2xl font-black text-emerald-950">Tom tat don hang</h2>
              <span className="text-sm font-semibold text-emerald-900/55">{items.length} san pham</span>
            </div>

            <div className="mb-5 space-y-3 border-b border-emerald-100 pb-5">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-900/55">Phuong thuc thanh toan</p>
              {paymentMethods.map((method) => {
                const isSelected = paymentMethod === method.value
                const Icon = method.value === 'PAYOS' ? CreditCard : Banknote

                return (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/80'
                        : 'border-emerald-100 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={isSelected}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isSelected ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-black text-emerald-950">{method.title}</span>
                        {isSelected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-emerald-900/65">{method.description}</span>
                      <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                        {method.tag}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-emerald-900/65">
                <span>Tam tinh</span>
                <span className="font-bold text-emerald-950">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-900/65">
                <span>Phi van chuyen</span>
                <span className="font-bold text-emerald-950">
                  {isLoadingShippingRule
                    ? 'Dang tinh...'
                    : shippingFee
                      ? formatCurrency(shippingFee)
                      : 'Mien phi van chuyen'}
                </span>
              </div>
              {!shippingFee && !isLoadingShippingRule ? (
                <p className="text-xs font-semibold text-emerald-700">Don hang duoc mien phi van chuyen.</p>
              ) : freeShippingGap > 0 ? (
                <p className="text-xs font-semibold text-emerald-700">
                  Mua them {formatCurrency(freeShippingGap)} de duoc mien phi van chuyen.
                </p>
              ) : null}
              <div className="flex justify-between text-emerald-900/65">
                <span>Giam gia</span>
                <span className="font-bold text-emerald-950">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-100 pt-4 text-lg font-black text-emerald-950">
                <span>Tong cong</span>
                <span className="text-2xl text-emerald-800">{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!selectedItems.length || isCheckingOut || isLoadingShippingRule}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {isCheckingOut
                ? 'Dang tao don...'
                : isLoadingShippingRule
                  ? 'Dang tinh phi ship...'
                  : 'Dat hang'}
            </button>
          </div>
        </aside>
      </div>

      <div className="grid gap-3 rounded-2xl bg-emerald-50/80 p-4 text-emerald-900 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: 'Chinh hang 100%', text: 'Cam ket san pham chinh hang' },
          { icon: PackageCheck, title: 'Doi tra de dang', text: 'Trong vong 7 ngay' },
          { icon: Truck, title: 'Giao hang nhanh', text: 'Mien phi cho don tu 1 trieu' },
          { icon: Banknote, title: 'Thanh toan linh hoat', text: 'Ngan hang hoac ship COD' },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div key={item.title} className="flex items-center gap-3 rounded-xl px-3 py-2">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-emerald-800">
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm font-black">{item.title}</span>
                <span className="mt-1 block text-sm text-emerald-800/70">{item.text}</span>
              </span>
            </div>
          )
        })}
      </div>

      {pendingRemoveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_24px_80px_rgba(2,44,34,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Xac nhan xoa</p>
            <h2 className="mt-2 text-2xl font-black text-emerald-950">Ban muon xoa san pham nay?</h2>
            <div className="mt-4 flex gap-4 rounded-2xl bg-emerald-50/70 p-3">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                {pendingRemoveItem.item.image ? (
                  <img
                    src={pendingRemoveItem.item.image}
                    alt={pendingRemoveItem.item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-neutral-400">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-black text-emerald-950">{pendingRemoveItem.item.name}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-900/55">
                  {pendingRemoveItem.item.colorName ? `Mau: ${pendingRemoveItem.item.colorName}` : 'Mau: -'} /{' '}
                  {pendingRemoveItem.item.size ? `Size: ${pendingRemoveItem.item.size}` : 'Size: -'}
                </p>
                <p className="mt-2 text-sm font-black text-emerald-800">
                  {formatCurrency(Number(pendingRemoveItem.item.price || 0) * Number(pendingRemoveItem.item.quantity || 0))}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Neu ban van con phan van, hay giu san pham lai trong gio hang de xem tiep truoc khi thanh toan.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeRemoveConfirm}
                disabled={isRemovingItem}
                className="h-11 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Giu lai
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemovingItem}
                className="h-11 rounded-lg bg-red-600 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemovingItem ? 'Dang xoa...' : 'Xoa san pham'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart
