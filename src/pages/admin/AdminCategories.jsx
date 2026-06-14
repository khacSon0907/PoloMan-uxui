import { useEffect, useMemo, useRef, useState } from "react";

import {
  categoryApi,
  flattenCategoryTree,
  getCategoryBusinessMessage,
  normalizeCategoryTree,
} from "../../features/category";
import { uploadImageToCloudinary } from "../../shared/services/cloudinaryUpload";

const initialForm = {
  name: "",
  description: "",
  bannerUrl: "",
  active: true,
  parentId: "",
  sortOrder: "0",
};

function AdminCategories() {
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingCategory?.id);
  const flattenedCategories = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );
  const categoryNameById = useMemo(
    () =>
      new Map(
        flattenedCategories
          .filter((category) => category.id)
          .map((category) => [String(category.id), category.name]),
      ),
    [flattenedCategories],
  );
  const parentOptions = useMemo(
    () =>
      flattenCategoryTree(categories, {
        excludeId: editingCategory?.id || "",
        excludeDescendantsOf: editingCategory?.id || "",
      }),
    [categories, editingCategory?.id],
  );

  const activeCount = useMemo(
    () =>
      flattenedCategories.filter((category) => category.active !== false)
        .length,
    [flattenedCategories],
  );

  const inactiveCount = Math.max(flattenedCategories.length - activeCount, 0);

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await categoryApi.list();
      setCategories(normalizeCategoryTree(list));
    } catch (error) {
      setErrorMessage(
        getCategoryBusinessMessage(error, "Khong the tai danh sach danh muc."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    categoryApi
      .list()
      .then((list) => {
        if (isMounted) {
          setCategories(normalizeCategoryTree(list));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getCategoryBusinessMessage(
              error,
              "Khong the tai danh sach danh muc.",
            ),
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
    if (!bannerPreviewUrl) return undefined;

    return () => {
      URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  const resetBannerPreview = () => {
    if (bannerPreviewUrl) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }

    setBannerFile(null);
    setBannerPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingCategory(null);
    resetBannerPreview();
  };

  const handleChange = (field) => (event) => {
    const value =
      field === "active" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleBannerChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui long chon file anh.");
      return;
    }

    if (bannerPreviewUrl) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }

    setBannerFile(file);
    setBannerPreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      description: category.description || "",
      bannerUrl: category.bannerUrl || "",
      active: category.active !== false,
      parentId: category.parentId || "",
      sortOrder: String(category.sortOrder ?? 0),
    });
    resetBannerPreview();
    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildPayload = async () => {
    let bannerUrl = form.bannerUrl.trim();

    if (bannerFile) {
      const uploadResult = await uploadImageToCloudinary(bannerFile, "CATEGORY");
      bannerUrl = uploadResult.secure_url || uploadResult.url;

      if (!bannerUrl) {
        throw new Error("Cloudinary khong tra ve link anh danh muc.");
      }
    }

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      bannerUrl,
      active: form.active,
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder || 0),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setErrorMessage("Ten danh muc phai tu 2 ky tu.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = await buildPayload();

      if (isEditing) {
        await categoryApi.update(editingCategory.id, payload);
        resetForm();
        setSuccessMessage("Cap nhat danh muc thanh cong.");
      } else {
        await categoryApi.create(payload);
        setForm(initialForm);
        setSuccessMessage("Tao danh muc thanh cong.");
      }
      await loadCategories();
    } catch (error) {
      setErrorMessage(
        getCategoryBusinessMessage(
          error,
          isEditing ? "Cap nhat danh muc that bai." : "Tao danh muc that bai.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    const categoryId = category.id;

    if (!categoryId || !window.confirm(`Xoa danh muc "${category.name}"?`)) {
      return;
    }

    setDeletingId(categoryId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await categoryApi.delete(categoryId);
      await loadCategories();

      if (editingCategory?.id === categoryId) {
        resetForm();
      }

      setSuccessMessage("Xoa danh muc thanh cong.");
    } catch (error) {
      setErrorMessage(
        getCategoryBusinessMessage(error, "Xoa danh muc that bai."),
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Category manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Danh muc san pham
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tao, cap nhat anh banner, trang thai va cac nhom san pham hien
              thi ngoai website.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">
                {flattenedCategories.length}
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Hien</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">An</p>
              <p className="mt-2 text-3xl font-black">{inactiveCount}</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[1fr_220px_150px_170px]">
              <div>
                <label
                  htmlFor="category-name"
                  className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
                >
                  Ten danh muc
                </label>
                <input
                  id="category-name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Ao polo, Ao so mi, Phu kien..."
                  className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="category-parent"
                  className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
                >
                  Danh muc cha
                </label>
                <select
                  id="category-parent"
                  value={form.parentId}
                  onChange={handleChange("parentId")}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                >
                  <option value="">Danh muc goc</option>
                  {parentOptions.map((category) => (
                    <option
                      key={category.id || category.slug || category.name}
                      value={category.id}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="category-sort-order"
                  className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
                >
                  Thu tu
                </label>
                <input
                  id="category-sort-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={handleChange("sortOrder")}
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 md:mt-7 md:h-11">
                <label
                  htmlFor="category-active"
                  className="text-sm font-semibold text-neutral-700"
                >
                  Active
                </label>
                <input
                  id="category-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={handleChange("active")}
                  className="h-5 w-5 accent-emerald-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="category-description"
                className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                Mo ta ngan
              </label>
              <textarea
                id="category-description"
                value={form.description}
                onChange={handleChange("description")}
                rows={4}
                placeholder="Mo ta giup SEO va hien thi ngoai website"
                className="mt-2 w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="category-banner-url"
                className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                URL anh banner
              </label>
              <input
                id="category-banner-url"
                value={form.bannerUrl}
                onChange={handleChange("bannerUrl")}
                placeholder="https://..."
                className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
              />
            </div>
          </div>

          <aside className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {bannerPreviewUrl || form.bannerUrl ? (
                <img
                  src={bannerPreviewUrl || form.bannerUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center px-4 text-center text-sm font-semibold text-neutral-400">
                  Chua co anh danh muc
                </div>
              )}
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-5 text-center transition-colors hover:border-emerald-600 hover:bg-emerald-50">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-emerald-800">
                Upload anh danh muc
              </span>
              <span className="text-xs leading-5 text-emerald-900/60">
                Uu tien anh ngang 16:10 de hien thi dep tren trang chu.
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="sr-only"
              />
            </label>
          </aside>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
            <div className="min-h-5 text-sm">
              {errorMessage && (
                <p className="font-medium text-red-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="font-medium text-emerald-600">{successMessage}</p>
              )}
              {isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">
                  Dang sua: {editingCategory.name}
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
                className="h-11 rounded-md bg-emerald-600 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Dang upload va luu..."
                  : isEditing
                    ? "Cap nhat"
                    : "Tao danh muc"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Danh sach danh muc
          </h2>
          <button
            type="button"
            onClick={loadCategories}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:border-emerald-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : flattenedCategories.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[940px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Danh muc</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3">SortOrder</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {flattenedCategories.map((category) => (
                  <tr
                    key={category.id || category.slug || category.name}
                    className={
                      editingCategory?.id === category.id
                        ? "bg-neutral-50"
                        : "bg-white"
                    }
                  >
                    <td className="px-5 py-4">
                      <div
                        className="flex items-start gap-3"
                        style={{ paddingLeft: `${category.level * 24}px` }}
                      >
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                          {category.bannerUrl ? (
                            <img
                              src={category.bannerUrl}
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
                          <div className="font-semibold text-neutral-950">
                            {category.name}
                          </div>
                          <div className="mt-1 max-w-xl text-sm text-neutral-500">
                            {category.description || "Chua co mo ta"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                      {category.slug ? `/${category.slug}` : "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-neutral-500">
                      {category.parentId
                        ? categoryNameById.get(String(category.parentId)) || "-"
                        : "Danh muc goc"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-neutral-700">
                      {category.sortOrder ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                          category.active === false
                            ? "border-neutral-200 text-neutral-500"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {category.active === false ? "An" : "Dang hien"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-emerald-600 hover:text-emerald-600"
                        >
                          Sua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          className="h-9 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === category.id ? "Dang xoa" : "Xoa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co danh muc
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Tao danh muc dau tien de hien thi ngoai website.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCategories;
