import { useEffect, useMemo, useRef, useState } from 'react'

import { categoryApi } from '../../features/category'
import { productApi } from '../../features/product'
import { getApiMessage } from '../../shared/api'
import { uploadImageToCloudinary } from '../../shared/services/cloudinaryUpload'

const emptySize = {
  size: '',
  sku: '',
  quantity: 0,
}

const emptyColor = {
  colorName: '',
  colorCode: '#111111',
  imageFiles: [],
  imagePreviews: [],
  sizes: [{ ...emptySize }],
}

const initialForm = {
  name: '',
  slug: '',
  categoryId: '',
  description: '',
  price: '',
  salePrice: '',
  active: true,
  colors: [{ ...emptyColor, sizes: [{ ...emptySize }] }],
}

function formatCurrency(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number.isFinite(number) ? number : 0)
}

function getProductId(product) {
  return product?.id || product?._id || product?.slug || product?.name
}

function getProductImage(product) {
  const firstColor = product?.colors?.[0] || product?.colorVariants?.[0]
  const firstImage = firstColor?.images?.[0] || product?.images?.[0]

  return firstImage?.url || firstImage?.secureUrl || product?.imageUrl || ''
}

function revokeColorPreviews(colors) {
  colors.forEach((color) => {
    color.imagePreviews?.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
  })
}

function AdminProducts() {
  const formColorsRef = useRef(initialForm.colors)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const totalStock = useMemo(
    () =>
      products.reduce((sum, product) => {
        const colors = product?.colors || product?.colorVariants || []
        return (
          sum +
          colors.reduce((colorSum, color) => {
            const sizes = color?.sizes || color?.sizeVariants || []
            return colorSum + sizes.reduce((sizeSum, size) => sizeSum + Number(size?.quantity || 0), 0)
          }, 0)
        )
      }, 0),
    [products],
  )

  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [productList, categoryList] = await Promise.all([
        productApi.list(),
        categoryApi.list(),
      ])
      setProducts(Array.isArray(productList) ? productList : [])
      setCategories(Array.isArray(categoryList) ? categoryList : [])
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Khong the tai du lieu san pham.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([productApi.list(), categoryApi.list()])
      .then(([productList, categoryList]) => {
        if (!isMounted) return
        setProducts(Array.isArray(productList) ? productList : [])
        setCategories(Array.isArray(categoryList) ? categoryList : [])
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getApiMessage(error, 'Khong the tai du lieu san pham.'))
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
    formColorsRef.current = form.colors
  }, [form.colors])

  useEffect(
    () => () => {
      revokeColorPreviews(formColorsRef.current)
    },
    [],
  )

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const updateColor = (colorIndex, field, value) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) =>
        index === colorIndex ? { ...color, [field]: value } : color,
      ),
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const updateSize = (colorIndex, sizeIndex, field, value) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color

        return {
          ...color,
          sizes: color.sizes.map((size, nestedIndex) =>
            nestedIndex === sizeIndex ? { ...size, [field]: value } : size,
          ),
        }
      }),
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const addColor = () => {
    setForm((current) => ({
      ...current,
      colors: [...current.colors, { ...emptyColor, sizes: [{ ...emptySize }] }],
    }))
  }

  const removeColor = (colorIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.filter((color, index) => {
        if (index === colorIndex) {
          revokeColorPreviews([color])
          return false
        }

        return true
      }),
    }))
  }

  const addSize = (colorIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) =>
        index === colorIndex ? { ...color, sizes: [...color.sizes, { ...emptySize }] } : color,
      ),
    }))
  }

  const removeSize = (colorIndex, sizeIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color

        return {
          ...color,
          sizes: color.sizes.filter((_, nestedIndex) => nestedIndex !== sizeIndex),
        }
      }),
    }))
  }

  const handleImageChange = (colorIndex, event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))
    event.target.value = ''

    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color

        color.imagePreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))

        return {
          ...color,
          imageFiles: files,
          imagePreviews: files.map((file) => URL.createObjectURL(file)),
        }
      }),
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const validateForm = () => {
    if (!form.name.trim()) return 'Ten san pham khong duoc de trong.'
    if (!form.categoryId) return 'Vui long chon danh muc.'
    if (Number(form.price) < 0 || form.price === '') return 'Gia san pham khong hop le.'
    if (form.salePrice !== '' && Number(form.salePrice) < 0) return 'Gia khuyen mai khong hop le.'
    if (!form.colors.length) return 'Can it nhat mot mau san pham.'

    for (const color of form.colors) {
      if (!color.colorName.trim()) return 'Ten mau khong duoc de trong.'
      if (!color.sizes.length) return 'Moi mau can it nhat mot size.'

      for (const size of color.sizes) {
        if (!size.size.trim()) return 'Kich thuoc khong duoc de trong.'
        if (size.quantity === '' || Number(size.quantity) < 0) return 'So luong size khong hop le.'
      }
    }

    return ''
  }

  const buildPayload = async () => {
    const colors = await Promise.all(
      form.colors.map(async (color) => {
        const uploadedImages = await Promise.all(
          color.imageFiles.map(async (file, index) => {
            const uploadResult = await uploadImageToCloudinary(file, 'PRODUCT')
            const imageUrl = uploadResult.secure_url || uploadResult.url

            if (!imageUrl) {
              throw new Error('Cloudinary khong tra ve link anh san pham.')
            }

            return {
              url: imageUrl,
              publicId: uploadResult.public_id || '',
              main: index === 0,
              sortOrder: index,
            }
          }),
        )

        return {
          colorName: color.colorName.trim(),
          colorCode: color.colorCode || '',
          images: uploadedImages,
          sizes: color.sizes.map((size) => ({
            size: size.size.trim(),
            sku: size.sku.trim(),
            quantity: Number(size.quantity || 0),
          })),
        }
      }),
    )

    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      categoryId: form.categoryId,
      description: form.description.trim(),
      price: Number(form.price),
      salePrice: form.salePrice === '' ? null : Number(form.salePrice),
      active: form.active,
      colors,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await buildPayload()
      const createdProduct = await productApi.create(payload)
      setProducts((current) => [createdProduct, ...current].filter(Boolean))
      revokeColorPreviews(form.colors)
      setForm(initialForm)
      setSuccessMessage('Tao san pham thanh cong.')
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Tao san pham that bai.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-neutral-950 p-5 text-white sm:p-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Product manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              San pham
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tao san pham kem bien the mau, size, ton kho va anh Cloudinary.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{products.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Danh muc</p>
              <p className="mt-2 text-3xl font-black">{categories.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Ton kho</p>
              <p className="mt-2 text-3xl font-black">{totalStock}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Ten san pham
              </span>
              <input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-black"
                placeholder="Ao polo premium"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Slug
              </span>
              <input
                value={form.slug}
                onChange={(event) => updateForm('slug', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-black"
                placeholder="ao-polo-premium"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Danh muc
              </span>
              <select
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-black"
              >
                <option value="">Chon danh muc</option>
                {categories.map((category) => (
                  <option key={category.id || category.slug} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Gia
              </span>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-black"
                placeholder="590000"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Gia KM
              </span>
              <input
                type="number"
                min="0"
                value={form.salePrice}
                onChange={(event) => updateForm('salePrice', event.target.value)}
                className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-black"
                placeholder="490000"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 lg:h-11">
              <span className="text-sm font-semibold text-neutral-700">Active</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
                className="h-5 w-5 accent-black"
              />
            </label>

            <label className="grid gap-2 lg:col-span-4">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                Mo ta
              </span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows={3}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-black"
                placeholder="Mo ta chat lieu, form dang va diem noi bat..."
              />
            </label>
          </div>

          <div className="space-y-4 border-t border-neutral-100 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-neutral-950">Bien the mau va size</h3>
              <button
                type="button"
                onClick={addColor}
                className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:border-black hover:text-black"
              >
                Them mau
              </button>
            </div>

            {form.colors.map((color, colorIndex) => (
              <div key={colorIndex} className="rounded-lg border border-neutral-200 p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_150px_1.4fr_auto] lg:items-end">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                      Ten mau
                    </span>
                    <input
                      value={color.colorName}
                      onChange={(event) => updateColor(colorIndex, 'colorName', event.target.value)}
                      className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-black"
                      placeholder="Den, Trang, Navy..."
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                      Ma mau
                    </span>
                    <input
                      type="color"
                      value={color.colorCode}
                      onChange={(event) => updateColor(colorIndex, 'colorCode', event.target.value)}
                      className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                      Anh san pham
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => handleImageChange(colorIndex, event)}
                      className="h-11 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                    />
                    {color.imageFiles.length > 0 && (
                      <span className="text-xs text-neutral-500">{color.imageFiles.length} anh da chon</span>
                    )}
                  </label>

                  {form.colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColor(colorIndex)}
                      className="h-11 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 hover:border-red-600 hover:bg-red-50"
                    >
                      Xoa mau
                    </button>
                  )}
                </div>

                {color.imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {color.imagePreviews.map((previewUrl, previewIndex) => (
                      <div
                        key={`${previewUrl}-${previewIndex}`}
                        className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
                      >
                        <img
                          src={previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {previewIndex === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {color.sizes.map((size, sizeIndex) => (
                    <div key={sizeIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_150px_auto] sm:items-end">
                      <label className="grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                          Size
                        </span>
                        <input
                          value={size.size}
                          onChange={(event) => updateSize(colorIndex, sizeIndex, 'size', event.target.value)}
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                          placeholder="S, M, L, XL"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                          SKU
                        </span>
                        <input
                          value={size.sku}
                          onChange={(event) => updateSize(colorIndex, sizeIndex, 'sku', event.target.value)}
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                          placeholder="POLO-BLK-M"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                          So luong
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={size.quantity}
                          onChange={(event) => updateSize(colorIndex, sizeIndex, 'quantity', event.target.value)}
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-black"
                        />
                      </label>

                      {color.sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSize(colorIndex, sizeIndex)}
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-600 hover:border-red-500 hover:text-red-600"
                        >
                          Xoa
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addSize(colorIndex)}
                    className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-black hover:text-black"
                  >
                    Them size
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5 text-sm">
              {errorMessage && <p className="font-medium text-red-600">{errorMessage}</p>}
              {successMessage && <p className="font-medium text-emerald-600">{successMessage}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-md bg-neutral-950 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Dang upload va tao...' : 'Tao san pham'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">Danh sach san pham</h2>
          <button
            type="button"
            onClick={loadData}
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
        ) : products.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">San pham</th>
                  <th className="px-5 py-3">Danh muc</th>
                  <th className="px-5 py-3">Gia</th>
                  <th className="px-5 py-3">Trang thai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => {
                  const imageUrl = getProductImage(product)

                  return (
                    <tr key={getProductId(product)} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                            {imageUrl ? (
                              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-semibold text-neutral-400">No img</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-950">{product.name}</div>
                            <div className="mt-1 text-sm text-neutral-500">
                              {product.slug ? `/${product.slug}` : 'Chua co slug'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {product.category?.name || product.categoryName || product.categoryId || '-'}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">
                        {formatCurrency(product.salePrice || product.price)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            product.active === false
                              ? 'border-neutral-200 text-neutral-500'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {product.active === false ? 'An' : 'Dang hien'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">Chua co san pham</h3>
            <p className="mt-2 text-sm text-neutral-500">Tao san pham dau tien de hien thi ngoai website.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminProducts
