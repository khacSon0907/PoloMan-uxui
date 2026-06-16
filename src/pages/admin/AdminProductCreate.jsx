import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  categoryApi,
  flattenCategoryTree,
  normalizeCategoryTree,
} from "../../features/category";
import {
  getImageUrl,
  getProductColorCode,
  getProductColorId,
  getProductColorName,
  getProductColors,
  getProductImages,
  getProductSizes,
  formatCurrency,
  productApi,
} from "../../features/product";
import { getApiMessage } from "../../shared/api";
import { uploadImageToCloudinary } from "../../shared/services/cloudinaryUpload";

const emptySize = {
  size: "",
  quantity: 0,
};

function createEmptyColor() {
  return {
    id: "",
    colorName: "",
    colorCode: "#111111",
    existingMainImage: null,
    existingMainImagePreview: "",
    mainImageFile: null,
    mainImagePreview: "",
    existingSubImages: [],
    subImageFiles: [],
    subImagePreviews: [],
    sizes: [{ ...emptySize }],
  };
}

const initialForm = {
  name: "",
  categoryId: "",
  description: "",
  price: "",
  salePrice: "",
  active: true,
  colors: [createEmptyColor()],
};

function revokePreviewUrl(previewUrl) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

function revokeColorPreviews(colors) {
  colors.forEach((color) => {
    revokePreviewUrl(color.mainImagePreview);

    color.subImagePreviews?.forEach(revokePreviewUrl);
  });
}

function getEntityId(entity) {
  return entity?.id || entity?._id || "";
}

function normalizeExistingImage(image, options = {}) {
  return {
    id: getEntityId(image),
    url: getImageUrl(image),
    publicId: image?.publicId || image?.public_id || "",
    main: options.main ?? Boolean(image?.main),
    sortOrder: options.sortOrder ?? Number(image?.sortOrder || 0),
  };
}

function mapProductToForm(product) {
  const colors = getProductColors(product);

  return {
    name: product?.name || "",
    categoryId: product?.category?.id || product?.category?._id || product?.categoryId || "",
    description: product?.description || "",
    price: product?.price ?? "",
    salePrice: product?.salePrice ?? "",
    active: product?.active !== false,
    colors: colors.length
      ? colors.map((color) => {
          const images = getProductImages(product, color)
            .map((image, index) => normalizeExistingImage(image, { sortOrder: image?.sortOrder ?? index }))
            .filter((image) => image.url);
          const mainImage = images.find((image) => image.main) || images[0] || null;
          const subImages = images.filter((image) => image !== mainImage);
          const sizes = getProductSizes(product, color);

          return {
            id: getProductColorId(color),
            colorName: getProductColorName(color),
            colorCode: getProductColorCode(color) || "#111111",
            existingMainImage: mainImage,
            existingMainImagePreview: mainImage?.url || "",
            mainImageFile: null,
            mainImagePreview: "",
            existingSubImages: subImages,
            subImageFiles: [],
            subImagePreviews: [],
            sizes: sizes.length
              ? sizes.map((size) => ({
                  id: getEntityId(size),
                  size: size?.size || size?.sizeName || size?.name || "",
                  quantity: size?.quantity ?? 0,
                }))
              : [{ ...emptySize }],
          };
        })
      : [createEmptyColor()],
  };
}

function AdminProductCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const formColorsRef = useRef(initialForm.colors);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const categoryOptions = useMemo(
    () => flattenCategoryTree(categories, { onlyActive: true }),
    [categories],
  );

  useEffect(() => {
    let isMounted = true;

    categoryApi
      .list()
      .then((categoryList) => {
        if (isMounted) {
          setCategories(normalizeCategoryTree(categoryList));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai danh muc san pham."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;

    let isMounted = true;

    productApi
      .getById(id)
      .then((product) => {
        if (isMounted) {
          setForm(mapProductToForm(product));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai thong tin san pham."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  useEffect(() => {
    formColorsRef.current = form.colors;
  }, [form.colors]);

  useEffect(
    () => () => {
      revokeColorPreviews(formColorsRef.current);
    },
    [],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const updateColor = (colorIndex, field, value) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) =>
        index === colorIndex ? { ...color, [field]: value } : color,
      ),
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const updateSize = (colorIndex, sizeIndex, field, value) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        return {
          ...color,
          sizes: color.sizes.map((size, nestedIndex) =>
            nestedIndex === sizeIndex ? { ...size, [field]: value } : size,
          ),
        };
      }),
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const addColor = () => {
    setForm((current) => ({
      ...current,
      colors: [...current.colors, createEmptyColor()],
    }));
  };

  const removeColor = (colorIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.filter((color, index) => {
        if (index === colorIndex) {
          revokeColorPreviews([color]);
          return false;
        }

        return true;
      }),
    }));
  };

  const addSize = (colorIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) =>
        index === colorIndex
          ? { ...color, sizes: [...color.sizes, { ...emptySize }] }
          : color,
      ),
    }));
  };

  const removeSize = (colorIndex, sizeIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        return {
          ...color,
          sizes: color.sizes.filter(
            (_, nestedIndex) => nestedIndex !== sizeIndex,
          ),
        };
      }),
    }));
  };

  const handleMainImageChange = (colorIndex, event) => {
    const file = Array.from(event.target.files || []).find((selectedFile) =>
      selectedFile.type.startsWith("image/"),
    );
    event.target.value = "";

    if (!file) return;

    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        revokePreviewUrl(color.mainImagePreview);

        return {
          ...color,
          existingMainImage: null,
          existingMainImagePreview: "",
          mainImageFile: file,
          mainImagePreview: URL.createObjectURL(file),
        };
      }),
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const clearMainImage = (colorIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        revokePreviewUrl(color.mainImagePreview);

        return {
          ...color,
          existingMainImage: null,
          existingMainImagePreview: "",
          mainImageFile: null,
          mainImagePreview: "",
        };
      }),
    }));
  };

  const handleSubImagesChange = (colorIndex, event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    event.target.value = "";

    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        const nextFiles = [...color.subImageFiles, ...files];
        const nextPreviews = [
          ...color.subImagePreviews,
          ...files.map((file) => URL.createObjectURL(file)),
        ];

        return {
          ...color,
          subImageFiles: nextFiles,
          subImagePreviews: nextPreviews,
        };
      }),
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const removeSubImage = (colorIndex, imageIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        const removedPreview = color.subImagePreviews[imageIndex];

        revokePreviewUrl(removedPreview);

        return {
          ...color,
          subImageFiles: color.subImageFiles.filter(
            (_, nestedIndex) => nestedIndex !== imageIndex,
          ),
          subImagePreviews: color.subImagePreviews.filter(
            (_, nestedIndex) => nestedIndex !== imageIndex,
          ),
        };
      }),
    }));
  };

  const removeExistingSubImage = (colorIndex, imageIndex) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        return {
          ...color,
          existingSubImages: color.existingSubImages.filter(
            (_, nestedIndex) => nestedIndex !== imageIndex,
          ),
        };
      }),
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Ten san pham khong duoc de trong.";
    if (!form.categoryId) return "Vui long chon danh muc.";
    if (form.price === "" || Number(form.price) < 0)
      return "Gia san pham khong hop le.";
    if (form.salePrice !== "" && Number(form.salePrice) < 0)
      return "Gia khuyen mai khong hop le.";
    if (!form.colors.length) return "Can it nhat mot mau san pham.";

    for (const color of form.colors) {
      if (!color.colorName.trim()) return "Ten mau khong duoc de trong.";
      if (!color.mainImageFile && !color.existingMainImagePreview)
        return `Mau ${color.colorName.trim() || "san pham"} can co anh chinh.`;
      if (!color.sizes.length) return "Moi mau can it nhat mot size.";

      for (const size of color.sizes) {
        if (!size.size.trim()) return "Kich thuoc khong duoc de trong.";
        if (size.quantity === "" || Number(size.quantity) < 0)
          return "So luong size khong hop le.";
      }
    }

    return "";
  };

  const uploadProductImage = async (file, options) => {
    const uploadResult = await uploadImageToCloudinary(file, "PRODUCT");
    const imageUrl = uploadResult.secure_url || uploadResult.url;

    if (!imageUrl) {
      throw new Error("Cloudinary khong tra ve link anh san pham.");
    }

    return {
      url: imageUrl,
      publicId: uploadResult.public_id || "",
      main: options.main,
      sortOrder: options.sortOrder,
    };
  };

  const buildPayload = async () => {
    const colors = await Promise.all(
      form.colors.map(async (color) => {
        const mainImage = color.mainImageFile
          ? await uploadProductImage(color.mainImageFile, {
              main: true,
              sortOrder: 0,
            })
          : color.existingMainImage
            ? { ...color.existingMainImage, main: true, sortOrder: 0 }
            : null;

        const subImages = await Promise.all(
          color.subImageFiles.map((file, index) =>
            uploadProductImage(file, {
              main: false,
              sortOrder: color.existingSubImages.length + index + 1,
            }),
          ),
        );

        return {
          id: color.id || undefined,
          colorName: color.colorName.trim(),
          colorCode: color.colorCode || "",
          images: [
            mainImage,
            ...color.existingSubImages.map((image, index) => ({
              ...image,
              main: false,
              sortOrder: index + 1,
            })),
            ...subImages,
          ].filter(Boolean),
          sizes: color.sizes.map((size) => ({
            id: size.id || undefined,
            size: size.size.trim(),
            quantity: Number(size.quantity || 0),
          })),
        };
      }),
    );

    return {
      name: form.name.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      price: Number(form.price),
      salePrice: form.salePrice === "" ? null : Number(form.salePrice),
      active: form.active,
      colors,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = await buildPayload();
      if (isEditMode) {
        await productApi.update(id, payload);
      } else {
        await productApi.create(payload);
      }
      revokeColorPreviews(form.colors);
      if (!isEditMode) {
        setForm(initialForm);
      }
      setSuccessMessage(
        isEditMode ? "Cap nhat san pham thanh cong." : "Tao san pham thanh cong.",
      );
      navigate("/admin/products", { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiMessage(
          error,
          isEditMode ? "Cap nhat san pham that bai." : "Tao san pham that bai.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm font-semibold text-neutral-500">
        Dang tai thong tin san pham...
      </div>
    );
  }

  const selectedCategory = categoryOptions.find(
    (category) => String(category.id) === String(form.categoryId),
  );
  const previewColor = form.colors[0] || createEmptyColor();
  const previewImage =
    previewColor.mainImagePreview ||
    previewColor.existingMainImagePreview ||
    previewColor.subImagePreviews?.[0] ||
    previewColor.existingSubImages?.[0]?.url ||
    "";
  const previewStock = form.colors.reduce(
    (sum, color) =>
      sum +
      color.sizes.reduce(
        (colorSum, size) => colorSum + Number(size.quantity || 0),
        0,
      ),
    0,
  );
  const previewSalePercent =
    Number(form.price) > 0 && Number(form.salePrice) > 0
      ? Math.round(((Number(form.price) - Number(form.salePrice)) / Number(form.price)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
            {isEditMode ? "Cap nhat san pham" : "Tao san pham moi"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Trang chu <span className="mx-2 text-neutral-300">&gt;</span> San pham{" "}
            <span className="mx-2 text-neutral-300">&gt;</span>{" "}
            <span className="font-semibold text-emerald-700">
              {isEditMode ? "Cap nhat" : "Tao san pham"}
            </span>
          </p>
        </div>
        <Link
          to="/admin/products"
          className="flex h-11 items-center justify-center rounded-xl border border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
        >
          Ve danh sach
        </Link>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-neutral-950">
                  Thong tin co ban
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Ten, danh muc, gia va mo ta hien thi ngoai website.
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                <span className="text-sm font-semibold text-neutral-700">
                  Dang ban
                </span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    updateForm("active", event.target.checked)
                  }
                  className="h-5 w-5 accent-emerald-600"
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Ten san pham
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600"
                  placeholder="Ao polo premium"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Danh muc
                </span>
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm("categoryId", event.target.value)
                  }
                  disabled={isLoadingCategories}
                  className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600 disabled:bg-neutral-50"
                >
                  <option value="">
                    {isLoadingCategories ? "Dang tai..." : "Chon danh muc"}
                  </option>
                  {categoryOptions.map((category) => (
                    <option
                      key={category.id || category.slug}
                      value={category.id}
                    >
                      {category.label}
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
                  onChange={(event) => updateForm("price", event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600"
                  placeholder="590000"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Gia khuyen mai
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.salePrice}
                  onChange={(event) =>
                    updateForm("salePrice", event.target.value)
                  }
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600"
                  placeholder="490000"
                />
              </label>

              <label className="grid gap-2 lg:col-span-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Mo ta
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={3}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-600"
                  placeholder="Mo ta chat lieu, form dang va diem noi bat..."
                />
              </label>
            </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-neutral-950">
                  Mau, size va hinh anh
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Moi mau can 1 anh chinh. Anh phu co the chon nhieu anh.
                </p>
              </div>
              <button
                type="button"
                onClick={addColor}
                className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:border-emerald-600 hover:text-emerald-600"
              >
                Them mau
              </button>
            </div>

            {form.colors.map((color, colorIndex) => (
              <div
                key={colorIndex}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_150px]">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                        Ten mau
                      </span>
                      <input
                        value={color.colorName}
                        onChange={(event) =>
                          updateColor(
                            colorIndex,
                            "colorName",
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600"
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
                        onChange={(event) =>
                          updateColor(
                            colorIndex,
                            "colorCode",
                            event.target.value,
                          )
                        }
                        className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                      />
                    </label>
                  </div>

                  {form.colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColor(colorIndex)}
                      className="h-11 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:border-red-600 hover:bg-red-50"
                    >
                      Xoa mau
                    </button>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                        Anh chinh
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleMainImageChange(colorIndex, event)
                        }
                        className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                      />
                    </label>

                    <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                      {color.mainImagePreview ? (
                        <>
                          <img
                            src={color.mainImagePreview}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                            Main
                          </span>
                          <button
                            type="button"
                            onClick={() => clearMainImage(colorIndex)}
                            className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs font-semibold text-red-600 shadow-sm"
                          >
                            Xoa
                          </button>
                        </>
                      ) : color.existingMainImagePreview ? (
                        <>
                          <img
                            src={color.existingMainImagePreview}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                            Main
                          </span>
                          <button
                            type="button"
                            onClick={() => clearMainImage(colorIndex)}
                            className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs font-semibold text-red-600 shadow-sm"
                          >
                            Xoa
                          </button>
                        </>
                      ) : (
                        <div className="flex aspect-square items-center justify-center px-4 text-center text-sm font-semibold text-neutral-400">
                          Chua chon anh chinh
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                        Anh phu
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) =>
                          handleSubImagesChange(colorIndex, event)
                        }
                        className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
                      />
                      {color.subImageFiles.length > 0 && (
                        <span className="text-xs text-neutral-500">
                          {color.subImageFiles.length} anh phu da chon
                        </span>
                      )}
                    </label>

                    {color.existingSubImages.length > 0 || color.subImagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                        {color.existingSubImages.map((image, imageIndex) => (
                          <div
                            key={`${image.id || image.url}-${imageIndex}`}
                            className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
                          >
                            <img
                              src={image.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute left-1 top-1 rounded bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">
                              Cu {imageIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeExistingSubImage(colorIndex, imageIndex)
                              }
                              className="absolute right-1 top-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-red-600"
                            >
                              Xoa
                            </button>
                          </div>
                        ))}
                        {color.subImagePreviews.map(
                          (previewUrl, previewIndex) => (
                            <div
                              key={`${previewUrl}-${previewIndex}`}
                              className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
                            >
                              <img
                                src={previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute left-1 top-1 rounded bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">
                                Phu {previewIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeSubImage(colorIndex, previewIndex)
                                }
                                className="absolute right-1 top-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-red-600"
                              >
                                Xoa
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-neutral-200 px-4 text-center text-sm font-semibold text-neutral-400">
                        Chua chon anh phu
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-neutral-950">
                      Size va ton kho
                    </h4>
                    <button
                      type="button"
                      onClick={() => addSize(colorIndex)}
                      className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-emerald-600 hover:text-emerald-600"
                    >
                      Them size
                    </button>
                  </div>

                  {color.sizes.map((size, sizeIndex) => (
                    <div
                      key={sizeIndex}
                      className="grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end"
                    >
                      <label className="grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                          Size
                        </span>
                        <input
                          value={size.size}
                          onChange={(event) =>
                            updateSize(
                              colorIndex,
                              sizeIndex,
                              "size",
                              event.target.value,
                            )
                          }
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600"
                          placeholder="S, M, L, XL"
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
                          onChange={(event) =>
                            updateSize(
                              colorIndex,
                              sizeIndex,
                              "quantity",
                              event.target.value,
                            )
                          }
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600"
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
                </div>
              </div>
            ))}
          </section>

          <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-h-5 text-sm">
              {errorMessage && (
                <p className="font-medium text-red-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="font-medium text-emerald-600">{successMessage}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/admin/products"
                className="flex h-11 items-center justify-center rounded-md border border-neutral-200 px-5 text-sm font-bold uppercase tracking-[0.14em] text-neutral-700 hover:border-emerald-600 hover:text-emerald-600"
              >
                Huy
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-md bg-emerald-600 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? isEditMode
                    ? "Dang upload va cap nhat..."
                    : "Dang upload va tao..."
                  : isEditMode
                    ? "Cap nhat san pham"
                    : "Tao san pham"}
              </button>
            </div>
          </div>
          </form>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <div className="p-5">
              <h3 className="text-base font-black text-neutral-950">Xem truoc san pham</h3>
              <div className="mt-4 overflow-hidden rounded-2xl bg-emerald-50">
                {previewImage ? (
                  <img src={previewImage} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center px-6 text-center text-sm font-semibold text-emerald-900/45">
                    Anh chinh se hien thi tai day
                  </div>
                )}
              </div>
              <h4 className="mt-5 line-clamp-2 text-lg font-black text-neutral-950">
                {form.name || "Ten san pham"}
              </h4>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-lg font-black text-emerald-700">
                  {formatCurrency(form.salePrice || form.price)}
                </span>
                {form.salePrice && (
                  <span className="text-sm font-semibold text-neutral-400 line-through">
                    {formatCurrency(form.price)}
                  </span>
                )}
                {previewSalePercent > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                    -{previewSalePercent}%
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <p>
                  <span className="font-bold text-neutral-950">Danh muc:</span>{" "}
                  {selectedCategory?.name || "Chua chon"}
                </p>
                <p>
                  <span className="font-bold text-neutral-950">Trang thai:</span>{" "}
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {form.active ? "Dang ban" : "Tam an"}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-emerald-100 p-5">
              <h3 className="text-base font-black text-neutral-950">Thong tin nhanh</h3>
              <div className="mt-4 space-y-3 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Gia ban</span>
                  <span className="font-bold text-neutral-950">{formatCurrency(form.price)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Gia khuyen mai</span>
                  <span className="font-bold text-neutral-950">{formatCurrency(form.salePrice)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Danh muc</span>
                  <span className="text-right font-bold text-neutral-950">{selectedCategory?.name || "-"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>So luong ton kho</span>
                  <span className="font-bold text-neutral-950">{previewStock}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <h3 className="text-base font-black text-emerald-950">Tips</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-900/70">
              <li>Ten san pham nen ngan gon, de hieu va chua tu khoa.</li>
              <li>Mo ta ngan se hien thi tren trang chi tiet san pham.</li>
              <li>Anh ro net giup tang ti le ban hang.</li>
              <li>Gia khuyen mai co the de trong neu khong ap dung.</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default AdminProductCreate;
