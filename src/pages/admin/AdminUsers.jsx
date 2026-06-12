import { useCallback, useEffect, useMemo, useState } from "react";

import { authApi } from "../../features/auth";
import { roleApi } from "../../features/role";
import { userApi } from "../../features/user";
import { getApiMessage, normalizeRoles, tokenStorage } from "../../shared/api";

function formatDate(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("vi-VN");
}

function getUserId(user) {
  return user?.id || user?._id || user?.userId || user?.username || user?.email;
}

function getRoleId(role) {
  return role?.id || role?._id || role?.roleId;
}

function normalizeRoleIds(roleIds) {
  if (!roleIds) return [];
  if (roleIds instanceof Set) return Array.from(roleIds).map(String);
  if (Array.isArray(roleIds)) return roleIds.map(String);
  if (typeof roleIds === "string") {
    return roleIds
      .split(",")
      .map((roleId) => roleId.trim())
      .filter(Boolean);
  }
  return [];
}

function buildRoleSelection(user, roles) {
  const directRoleIds = normalizeRoleIds(user?.roleIds);
  if (directRoleIds.length) return directRoleIds;

  const userRoles = new Set(
    normalizeRoles(user?.roles || user?.role).map((role) => role.toUpperCase()),
  );

  return roles
    .filter((role) => userRoles.has(String(role?.code || "").toUpperCase()))
    .map(getRoleId)
    .filter(Boolean)
    .map(String);
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleSelections, setRoleSelections] = useState({});
  const [savingUserId, setSavingUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const counts = useMemo(() => {
    const total = users.length;
    const active = users.filter(
      (u) => u?.status?.toUpperCase?.() === "ACTIVE",
    ).length;
    return { total, active, roles: roles.length };
  }, [roles.length, users]);

  const syncSelections = useCallback((nextUsers, nextRoles) => {
    const nextSelections = {};

    nextUsers.forEach((user) => {
      const userId = getUserId(user);
      if (!userId) return;
      nextSelections[userId] = buildRoleSelection(user, nextRoles);
    });

    setRoleSelections(nextSelections);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [userList, roleList] = await Promise.all([
        userApi.getAll(),
        roleApi.list(),
      ]);
      const nextUsers = Array.isArray(userList) ? userList : [];
      const nextRoles = Array.isArray(roleList) ? roleList : [];

      setUsers(nextUsers);
      setRoles(nextRoles);
      syncSelections(nextUsers, nextRoles);
      return { users: nextUsers, roles: nextRoles };
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Khong the tai duoc nguoi dung hoac role."),
      );
      return { users: [], roles: [] };
    } finally {
      setIsLoading(false);
    }
  }, [syncSelections]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([userApi.getAll(), roleApi.list()])
      .then(([userList, roleList]) => {
        if (!isMounted) return;

        const nextUsers = Array.isArray(userList) ? userList : [];
        const nextRoles = Array.isArray(roleList) ? roleList : [];
        setUsers(nextUsers);
        setRoles(nextRoles);
        syncSelections(nextUsers, nextRoles);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(
          getApiMessage(error, "Khong the tai duoc nguoi dung hoac role."),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [syncSelections]);

  const handleRoleToggle = (userId, roleId) => (event) => {
    setRoleSelections((current) => {
      const selected = new Set(current[userId] || []);

      if (event.target.checked) {
        selected.add(roleId);
      } else {
        selected.delete(roleId);
      }

      return { ...current, [userId]: Array.from(selected) };
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSaveRoles = async (user) => {
    const userId = getUserId(user);
    if (!userId) return;

    const roleIds = roleSelections[userId] || [];
    setSavingUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedUser = await userApi.assignRoles(userId, roleIds);

      setUsers((current) =>
        current.map((item) =>
          getUserId(item) === userId
            ? {
                ...item,
                ...updatedUser,
                roleIds,
                roles: roles
                  .filter((role) => roleIds.includes(String(getRoleId(role))))
                  .map((role) => role.code)
                  .filter(Boolean),
              }
            : item,
        ),
      );

      const currentUser = tokenStorage.getUser();
      const currentUserId = getUserId(currentUser);

      if (currentUserId && String(currentUserId) === String(userId)) {
        await authApi.refreshToken().catch(() => authApi.getMe());
        setSuccessMessage(
          "Cap nhat role thanh cong. Token tai khoan hien tai da duoc lam moi.",
        );
      } else {
        setSuccessMessage("Cap nhat role nguoi dung thanh cong.");
      }
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Cap nhat role nguoi dung that bai."));
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              User manager
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold text-neutral-950 sm:text-2xl">
              Khach hang va phan quyen
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Gan role cho tai khoan bang danh sach role dong tu backend.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                Roles
              </p>
              <p className="mt-1 text-2xl font-semibold text-sky-700">
                {counts.roles}
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
          <div className="min-h-5 flex-1 text-sm">
            {errorMessage && (
              <p className="font-medium text-red-600">{errorMessage}</p>
            )}
            {successMessage && (
              <p className="font-medium text-emerald-600">{successMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={loadData}
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
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Nguoi dung</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">So dien thoai</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3">Roles</th>
                  <th className="px-5 py-3">Tao luc</th>
                  <th className="px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((user) => {
                  const userId = getUserId(user);
                  const status = user?.status || "-";
                  const selectedRoleIds = roleSelections[userId] || [];

                  return (
                    <tr key={userId} className="bg-white align-top">
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
                          <div className="grid min-w-[260px] gap-2 sm:grid-cols-2">
                            {roles.map((role) => {
                              const roleId = String(getRoleId(role) || "");
                              if (!roleId) return null;

                              return (
                                <label
                                  key={roleId}
                                  className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedRoleIds.includes(roleId)}
                                    onChange={handleRoleToggle(userId, roleId)}
                                    className="h-4 w-4 accent-emerald-600"
                                  />
                                  <span className="min-w-0 truncate">
                                    {role.code || role.name || roleId}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-neutral-500">
                            Chua co role
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {formatDate(user?.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveRoles(user)}
                          disabled={!roles.length || savingUserId === userId}
                          className="h-9 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingUserId === userId ? "Dang luu" : "Luu role"}
                        </button>
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
