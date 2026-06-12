import { useEffect, useMemo, useState } from "react";

import { roleApi } from "../../features/role";
import { getApiMessage } from "../../shared/api";

const initialForm = {
  code: "",
  name: "",
  description: "",
  active: true,
};

function getRoleId(role) {
  return role?.id || role?._id || role?.roleId;
}

function normalizeRole(role) {
  if (!role) return null;

  return {
    ...role,
    active: role.active !== false,
  };
}

function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingRole, setEditingRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(getRoleId(editingRole));
  const activeCount = useMemo(
    () => roles.filter((role) => role.active !== false).length,
    [roles],
  );
  const inactiveCount = Math.max(roles.length - activeCount, 0);

  const loadRoles = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await roleApi.list();
      setRoles(Array.isArray(list) ? list.map(normalizeRole).filter(Boolean) : []);
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the tai danh sach role."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    roleApi
      .list()
      .then((list) => {
        if (!isMounted) return;
        setRoles(
          Array.isArray(list) ? list.map(normalizeRole).filter(Boolean) : [],
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(getApiMessage(error, "Khong the tai danh sach role."));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingRole(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleChange = (field) => (event) => {
    const value =
      field === "active" ? event.target.checked : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: field === "code" ? String(value).toUpperCase() : value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setForm({
      code: role?.code || "",
      name: role?.name || "",
      description: role?.description || "",
      active: role?.active !== false,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
    };

    if (!payload.code || !payload.name) {
      setErrorMessage("Vui long nhap code va ten role.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isEditing) {
        const updatedRole = await roleApi.update(getRoleId(editingRole), payload);
        const normalizedRole = normalizeRole(updatedRole) || {
          ...editingRole,
          ...payload,
        };

        setRoles((current) =>
          current.map((role) =>
            getRoleId(role) === getRoleId(editingRole) ? normalizedRole : role,
          ),
        );
        resetForm();
        setSuccessMessage("Cap nhat role thanh cong.");
      } else {
        const createdRole = await roleApi.create(payload);
        setRoles((current) =>
          [normalizeRole(createdRole), ...current.filter(Boolean)].filter(Boolean),
        );
        setForm(initialForm);
        setSuccessMessage("Tao role thanh cong.");
      }
    } catch (error) {
      setErrorMessage(
        getApiMessage(
          error,
          isEditing ? "Cap nhat role that bai." : "Tao role that bai.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-neutral-950 p-5 text-white sm:p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Role manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Quan ly role
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tao va cap nhat role dong de backend gan quyen cho nguoi dung.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{roles.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Active</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Inactive</p>
              <p className="mt-2 text-3xl font-black">{inactiveCount}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr_150px]">
            <div>
              <label
                htmlFor="role-code"
                className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                Code
              </label>
              <input
                id="role-code"
                value={form.code}
                onChange={handleChange("code")}
                placeholder="SHIPPER"
                className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm font-semibold uppercase text-neutral-950 outline-none transition-colors focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="role-name"
                className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                Ten role
              </label>
              <input
                id="role-name"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Shipper"
                className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 md:mt-7 md:h-11">
              <label
                htmlFor="role-active"
                className="text-sm font-semibold text-neutral-700"
              >
                Active
              </label>
              <input
                id="role-active"
                type="checkbox"
                checked={form.active}
                onChange={handleChange("active")}
                className="h-5 w-5 accent-emerald-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="role-description"
              className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500"
            >
              Mo ta
            </label>
            <textarea
              id="role-description"
              value={form.description}
              onChange={handleChange("description")}
              rows={3}
              placeholder="Nhan vien giao hang"
              className="mt-2 w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5 text-sm">
              {errorMessage && (
                <p className="font-medium text-red-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="font-medium text-emerald-600">{successMessage}</p>
              )}
              {isEditing && !errorMessage && !successMessage && (
                <p className="font-medium text-neutral-500">
                  Dang sua: {editingRole.code}
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
                    : "Tao role"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Danh sach role
          </h2>
          <button
            type="button"
            onClick={loadRoles}
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
        ) : roles.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Ten role</th>
                  <th className="px-5 py-3">Mo ta</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {roles.map((role) => (
                  <tr
                    key={getRoleId(role) || role.code}
                    className={
                      getRoleId(editingRole) === getRoleId(role)
                        ? "bg-neutral-50"
                        : "bg-white"
                    }
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700">
                        {role.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-neutral-950">
                      {role.name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-neutral-500">
                      {role.description || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                          role.active === false
                            ? "border-neutral-200 text-neutral-500"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {role.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(role)}
                        className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-emerald-600 hover:text-emerald-600"
                      >
                        Sua
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co role
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Tao role dau tien de gan quyen cho nguoi dung.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminRoles;
