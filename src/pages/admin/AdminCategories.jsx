import { useEffect, useMemo, useState } from "react";

import { categoryApi } from "../../features/category";
import { getApiMessage } from "../../shared/api";

const initialForm = {
  name: "",
  description: "",
  active: true,
};

function normalizeCategory(category) {
  if (!category) return null;

  return {
    ...category,
    active: category.active !== false,
  };
}

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingCategory?.id);

  const activeCount = useMemo(
    () => categories.filter((category) => category.active !== false).length,
    [categories],
  );

  const inactiveCount = Math.max(categories.length - activeCount, 0);

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await categoryApi.list();
      setCategories(
        Array.isArray(list) ? list.map(normalizeCategory).filter(Boolean) : [],
      );
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Khong the tai danh sach danh muc."),
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
          setCategories(
            Array.isArray(list)
              ? list.map(normalizeCategory).filter(Boolean)
              : [],
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai danh sach danh muc."),
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

  const resetForm = () => {
    setForm(initialForm);
    setEditingCategory(null);
  };

  const handleChange = (field) => (event) => {
    const value =
      field === "active" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      description: category.description || "",
      active: category.active !== false,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
    };

    if (payload.name.length < 1) {
      setErrorMessage("Ten danh muc khong duoc de trong.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isEditing) {
        const updatedCategory = await categoryApi.update(
          editingCategory.id,
          payload,
        );
        const normalizedCategory = normalizeCategory(updatedCategory) || {
          ...editingCategory,
          ...payload,
        };

        setCategories((current) =>
          current.map((category) =>
            category.id === editingCategory.id ? normalizedCategory : category,
          ),
        );
        resetForm();
        setSuccessMessage("Cap nhat danh muc thanh cong.");
      } else {
        const createdCategory = await categoryApi.create(payload);
        setCategories((current) =>
          [
            normalizeCategory(createdCategory),
            ...current.filter(Boolean),
          ].filter(Boolean),
        );
        setForm(initialForm);
        setSuccessMessage("Tao danh muc thanh cong.");
      }
    } catch (error) {
      setErrorMessage(
        getApiMessage(
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
      setCategories((current) =>
        current.filter((item) => item.id !== categoryId),
      );

      if (editingCategory?.id === categoryId) {
        resetForm();
      }

      setSuccessMessage("Xoa danh muc thanh cong.");
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Xoa danh muc that bai."));
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
              Tao, cap nhat trang thai va xoa cac nhom san pham hien thi ngoai
              website.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{categories.length}</p>
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
          className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_140px] lg:items-end"
        >
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
              htmlFor="category-description"
              className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
            >
              Mo ta ngan
            </label>
            <input
              id="category-description"
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Mo ta giup SEO va hien thi ngoai website"
              className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 lg:h-11">
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

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
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
                  ? "Dang luu..."
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
        ) : categories.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Danh muc</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {categories.map((category) => (
                  <tr
                    key={category.id || category.slug || category.name}
                    className={
                      editingCategory?.id === category.id
                        ? "bg-neutral-50"
                        : "bg-white"
                    }
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-neutral-950">
                        {category.name}
                      </div>
                      <div className="mt-1 max-w-xl text-sm text-neutral-500">
                        {category.description || "Chua co mo ta"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                      {category.slug ? `/${category.slug}` : "-"}
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
