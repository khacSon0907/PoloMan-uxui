import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { categoryApi } from "../../features/category";
import { productApi } from "../../features/product";
import { getApiMessage } from "../../shared/api";
import { uploadImageToCloudinary } from "../../shared/services/cloudinaryUpload";

const emptySize = {
  size: "",
  sku: "",
  quantity: 0,
};

function createEmptyColor() {
  return {
    colorName: "",
    colorCode: "#111111",
    mainImageFile: null,
    mainImagePreview: "",
    subImageFiles: [],
    subImagePreviews: [],
    sizes: [{ ...emptySize }],
  };
}

const initialForm = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  price: "",
  salePrice: "",
  active: true,
  colors: [createEmptyColor()],
};

function revokeColorPreviews(colors) {
  colors.forEach((color) => {
    if (color.mainImagePreview) {
      URL.revokeObjectURL(color.mainImagePreview);
    }

    color.subImagePreviews?.forEach((previewUrl) =>
      URL.revokeObjectURL(previewUrl),
    );
  });
}

function AdminProductCreate() {
  const navigate = useNavigate();
  const formColorsRef = useRef(initialForm.colors);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    categoryApi
      .list()
      .then((categoryList) => {
        if (isMounted) {
          setCategories(Array.isArray(categoryList) ? categoryList : []);
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

        if (color.mainImagePreview) {
          URL.revokeObjectURL(color.mainImagePreview);
        }

        return {
          ...color,
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

        if (color.mainImagePreview) {
          URL.revokeObjectURL(color.mainImagePreview);
        }

        return {
          ...color,
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

        if (removedPreview) {
          URL.revokeObjectURL(removedPreview);
        }

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
      if (!color.mainImageFile)
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
        const mainImage = await uploadProductImage(color.mainImageFile, {
          main: true,
          sortOrder: 0,
        });

        const subImages = await Promise.all(
          color.subImageFiles.map((file, index) =>
            uploadProductImage(file, {
              main: false,
              sortOrder: index + 1,
            }),
          ),
        );

        return {
          colorName: color.colorName.trim(),
          colorCode: color.colorCode || "",
          images: [mainImage, ...subImages],
          sizes: color.sizes.map((size) => ({
            size: size.size.trim(),
            sku: size.sku.trim(),
            quantity: Number(size.quantity || 0),
          })),
        };
      }),
    );

    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
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
      await productApi.create(payload);
      revokeColorPreviews(form.colors);
      setForm(initialForm);
      setSuccessMessage("Tao san pham thanh cong.");
      navigate("/admin/products", { replace: true });
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Tao san pham that bai."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Product setup
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Tao san pham moi
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Nhap thong tin co ban, them mau, size, anh chinh va nhieu anh phu
              cho tung mau.
            </p>
          </div>
          <Link
            to="/admin/products"
            className="flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-white/10"
          >
            Ve danh sach
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-5">
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-950">
                  Thong tin co ban
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Ten, danh muc, gia va mo ta hien thi ngoai website.
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2">
                <span className="text-sm font-semibold text-neutral-700">
                  Active
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

            <div className="grid gap-4 lg:grid-cols-4">
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
                  Slug
                </span>
                <input
                  value={form.slug}
                  onChange={(event) => updateForm("slug", event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none focus:border-emerald-600"
                  placeholder="ao-polo-premium"
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
                  {categories.map((category) => (
                    <option
                      key={category.id || category.slug}
                      value={category.id}
                    >
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

          <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
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

                    {color.subImagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
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
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_150px_auto] sm:items-end"
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
                          SKU
                        </span>
                        <input
                          value={size.sku}
                          onChange={(event) =>
                            updateSize(
                              colorIndex,
                              sizeIndex,
                              "sku",
                              event.target.value,
                            )
                          }
                          className="h-10 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600"
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
                {isSubmitting ? "Dang upload va tao..." : "Tao san pham"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AdminProductCreate;
