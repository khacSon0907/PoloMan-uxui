import { useEffect, useMemo, useRef, useState } from "react";

import { bannerApi } from "../../features/banner";
import { getApiMessage } from "../../shared/api";
import { uploadImageToCloudinary } from "../../shared/services/cloudinaryUpload";

const initialForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "/products",
  active: true,
  sortOrder: 0,
};

function normalizeBanner(banner) {
  if (!banner) return null;

  return {
    ...banner,
    active: banner.active !== false,
    sortOrder: Number(banner.sortOrder || 0),
  };
}

function getBannerId(banner) {
  return banner?.id || banner?._id || banner?.imageUrl || banner?.title;
}

function AdminBanners() {
  const fileInputRef = useRef(null);
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingBanner, setEditingBanner] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(getBannerId(editingBanner));
  const activeCount = useMemo(
    () => banners.filter((banner) => banner.active !== false).length,
    [banners],
  );

  const loadBanners = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await bannerApi.list();
      setBanners(
        Array.isArray(list) ? list.map(normalizeBanner).filter(Boolean) : [],
      );
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the tai danh sach banner."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    bannerApi
      .list()
      .then((list) => {
        if (isMounted) {
          setBanners(
            Array.isArray(list)
              ? list.map(normalizeBanner).filter(Boolean)
              : [],
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai danh sach banner."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!imagePreviewUrl) return undefined;

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const resetImagePreview = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingBanner(null);
    resetImagePreview();
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui long chon file anh.");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      linkUrl: banner.linkUrl || "/products",
      active: banner.active !== false,
      sortOrder: Number(banner.sortOrder || 0),
    });
    resetImagePreview();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildPayload = async () => {
    let imageUrl = form.imageUrl.trim();

    if (imageFile) {
      const uploadResult = await uploadImageToCloudinary(imageFile, "BANNER");
      imageUrl = uploadResult.secure_url || uploadResult.url;

      if (!imageUrl) {
        throw new Error("Cloudinary khong tra ve link anh banner.");
      }
    }

    return {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      imageUrl,
      linkUrl: form.linkUrl.trim(),
      active: form.active,
      sortOrder: Number(form.sortOrder || 0),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("Tieu de banner khong duoc de trong.");
      return;
    }

    if (!form.imageUrl.trim() && !imageFile) {
      setErrorMessage("Vui long nhap URL anh hoac upload anh banner.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = await buildPayload();

      if (isEditing) {
        const updatedBanner = await bannerApi.update(
          getBannerId(editingBanner),
          payload,
        );
        const normalizedBanner = normalizeBanner(updatedBanner) || {
          ...editingBanner,
          ...payload,
        };

        setBanners((current) =>
          current.map((banner) =>
            getBannerId(banner) === getBannerId(editingBanner)
              ? normalizedBanner
              : banner,
          ),
        );
        resetForm();
        setSuccessMessage("Cap nhat banner thanh cong.");
      } else {
        const createdBanner = await bannerApi.create(payload);
        setBanners((current) =>
          [normalizeBanner(createdBanner), ...current].filter(Boolean),
        );
        resetForm();
        setSuccessMessage("Tao banner thanh cong.");
      }
    } catch (error) {
      setErrorMessage(
        getApiMessage(
          error,
          isEditing ? "Cap nhat banner that bai." : "Tao banner that bai.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (banner) => {
    const bannerId = getBannerId(banner);

    if (!bannerId || !window.confirm(`Xoa banner "${banner.title}"?`)) {
      return;
    }

    setDeletingId(bannerId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await bannerApi.delete(bannerId);
      setBanners((current) =>
        current.filter((item) => getBannerId(item) !== bannerId),
      );

      if (getBannerId(editingBanner) === bannerId) {
        resetForm();
      }

      setSuccessMessage("Xoa banner thanh cong.");
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Xoa banner that bai."));
    } finally {
      setDeletingId("");
    }
  };

  const previewImageUrl = imagePreviewUrl || form.imageUrl;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#064e3b_0%,#047857_58%,#0f766e_100%)] p-5 text-white sm:p-6 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Banner manager
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Banner trang chu
              </h2>
              {isEditing && (
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                  Dang chinh sua
                </span>
              )}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tao va cap nhat anh hero ngoai trang chu ma khong can sua code
              frontend.
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

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_420px]"
        >
          <div className="grid gap-5">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
              <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-neutral-950">
                    Noi dung banner
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Nhap noi dung se hien thi tren hero trang chu.
                  </p>
                </div>
                <label className="inline-flex h-9 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => updateForm("active", event.target.checked)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                  {form.active ? "Dang hien" : "Dang an"}
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Tieu de
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className="h-12 rounded-md border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition-colors placeholder:text-neutral-300 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
                    placeholder="BST MUA HE 2026"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Mo ta
                  </span>
                  <textarea
                    value={form.subtitle}
                    onChange={(event) => updateForm("subtitle", event.target.value)}
                    rows={4}
                    className="resize-none rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm leading-6 text-neutral-800 outline-none transition-colors placeholder:text-neutral-300 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
                    placeholder="Noi dung hien thi tren hero..."
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-[1fr_150px]">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Link nut xem
                </span>
                <input
                  value={form.linkUrl}
                  onChange={(event) =>
                    updateForm("linkUrl", event.target.value)
                  }
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm font-medium outline-none transition-colors focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
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
                  onChange={(event) =>
                    updateForm("sortOrder", event.target.value)
                  }
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm font-medium outline-none transition-colors focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  URL anh
                </span>
                <input
                  value={form.imageUrl}
                  onChange={(event) => updateForm("imageUrl", event.target.value)}
                  className="h-11 rounded-md border border-neutral-200 px-3 text-sm font-medium outline-none transition-colors focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
                  placeholder="https://..."
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-6 text-center transition-colors hover:border-emerald-600 hover:bg-emerald-50">
                <span className="text-sm font-black uppercase tracking-[0.12em] text-emerald-800">
                  Upload anh banner
                </span>
                <span className="text-sm text-emerald-900/60">
                  Chon anh hero ngang, uu tien ti le 16:9 hoac 16:10.
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                  Live preview
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${form.active ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/50"}`}>
                  {form.active ? "Visible" : "Hidden"}
                </span>
              </div>
              {previewImageUrl ? (
                <div className="relative aspect-[16/10]">
                  <img
                    src={previewImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                      PoloMan
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight">
                      {form.title || "Tieu de banner"}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/75">
                      {form.subtitle || "Mo ta ngan cua banner se hien thi tai day."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-neutral-100 text-sm font-semibold text-neutral-400">
                  Chua co anh
                </div>
              )}
            </div>

            <div className="min-h-5 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              {errorMessage && (
                <p className="font-medium text-red-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="font-medium text-emerald-600">{successMessage}</p>
              )}
              {isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">
                  Dang sua: {editingBanner.title}
                </p>
              )}
              {!isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">
                  San sang tao banner moi.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-md border border-neutral-200 px-5 text-sm font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-600"
                >
                  Huy
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-md bg-emerald-700 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Dang luu..."
                  : isEditing
                    ? "Cap nhat banner"
                    : "Tao banner"}
              </button>
            </div>
          </aside>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Danh sach banner
          </h2>
          <button
            type="button"
            onClick={loadBanners}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-emerald-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
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
                  const bannerId = getBannerId(banner);

                  return (
                    <tr
                      key={bannerId}
                      className={
                        getBannerId(editingBanner) === bannerId
                          ? "bg-emerald-50/70"
                          : "bg-white hover:bg-neutral-50/70"
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-18 w-32 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 shadow-sm">
                            {banner.imageUrl ? (
                              <img
                                src={banner.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                                No img
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-neutral-950">
                              {banner.title}
                            </div>
                            <div className="mt-1 max-w-xl line-clamp-2 text-sm leading-5 text-neutral-500">
                              {banner.subtitle || "Chua co mo ta"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {banner.linkUrl || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">
                        {banner.sortOrder || 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            banner.active === false
                              ? "border-neutral-200 text-neutral-500"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {banner.active === false ? "An" : "Dang hien"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(banner)}
                            className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-emerald-600 hover:text-emerald-600"
                          >
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner)}
                            disabled={deletingId === bannerId}
                            className="h-9 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === bannerId ? "Dang xoa" : "Xoa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co banner
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Tao banner dau tien de hien thi tren trang chu.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminBanners;
