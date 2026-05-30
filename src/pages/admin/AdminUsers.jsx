import { useEffect, useMemo, useState } from "react";

import { userApi } from "../../features/user";
import { getApiMessage } from "../../shared/api";

function formatDate(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("vi-VN");
}

function normalizeRoles(roles) {
  if (!roles) return [];
  if (roles instanceof Set) return Array.from(roles).map(String);
  if (Array.isArray(roles)) return roles.map(String);
  if (typeof roles === "string")
    return roles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  if (typeof roles === "object") return Object.values(roles).map(String);
  return [];
}

function getUserId(user) {
  return user?.id || user?._id || user?.username || user?.email;
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const counts = useMemo(() => {
    const total = users.length;
    const active = users.filter(
      (u) => u?.status?.toUpperCase?.() === "ACTIVE",
    ).length;
    return { total, active };
  }, [users]);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await userApi.getAll();
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the tai duoc nguoi dung."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    userApi
      .getAll()
      .then((list) => {
        if (!isMounted) return;
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(getApiMessage(error, "Khong the tai duoc nguoi dung."));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              User manager
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold text-neutral-950 sm:text-2xl">
              Khach hang
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Hien thi danh sach tat ca tai khoan trong he thong.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Tong
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-950">
                {counts.total}
              </p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                Active
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">
                {counts.active}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Danh sach nguoi dung
          </h2>
          <div className="min-h-5 text-sm">
            {errorMessage && (
              <p className="font-medium text-red-600">{errorMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={loadUsers}
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
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Nguoi dung</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">So dien thoai</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3">Roles</th>
                  <th className="px-5 py-3">Tao luc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((user) => {
                  const status = user?.status || "-";
                  const roles = normalizeRoles(user?.roles);

                  return (
                    <tr key={getUserId(user)} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-950">
                          {user?.username || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {user?.email || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {user?.phoneNumber || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            String(status).toUpperCase() === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-neutral-200 text-neutral-500"
                          }`}
                        >
                          {String(status).toUpperCase() === "ACTIVE"
                            ? "Dang hoat dong"
                            : String(status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {roles.length ? (
                          <div className="flex flex-wrap gap-2">
                            {roles.slice(0, 3).map((r) => (
                              <span
                                key={r}
                                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600"
                              >
                                {r}
                              </span>
                            ))}
                            {roles.length > 3 && (
                              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600">
                                +{roles.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-neutral-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {formatDate(user?.createdAt)}
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
              Chua co nguoi dung
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              He thong chua tra ve danh sach nguoi dung.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminUsers;
