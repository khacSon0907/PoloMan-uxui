import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";

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

function getUserName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || "-";
}

function getInitial(user) {
  return getUserName(user).trim().charAt(0).toUpperCase() || "U";
}

function getStatusLabel(status) {
  return String(status || "").toUpperCase() === "ACTIVE" ? "Hoat dong" : status || "-";
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
  if (directRoleIds.length) return directRoleIds[0] || "";

  const userRoles = new Set(
    normalizeRoles(user?.roles || user?.role).map((role) => role.toUpperCase()),
  );

  const matchedRole = roles.find((role) =>
    userRoles.has(String(role?.code || role?.name || "").toUpperCase()),
  );

  return matchedRole ? String(getRoleId(matchedRole) || "") : "";
}

function getRoleLabel(role) {
  return role?.code || role?.name || String(getRoleId(role) || "");
}

function getSelectedRoleLabel(userId, roleSelections, roles) {
  const roleId = roleSelections[userId];
  const role = roles.find((item) => String(getRoleId(item)) === String(roleId));
  return role ? getRoleLabel(role) : "Chua phan role";
}

function isNewUser(user) {
  const createdAt = new Date(user?.createdAt || "");
  if (Number.isNaN(createdAt.getTime())) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() <= sevenDays;
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleSelections, setRoleSelections] = useState({});
  const [savingUserId, setSavingUserId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const counts = useMemo(() => {
    const total = users.length;
    const withRole = users.filter((user) => {
      const userId = getUserId(user);
      return Boolean(roleSelections[userId]);
    }).length;
    const newUsers = users.filter(isNewUser).length;

    return { total, withRole, newUsers };
  }, [roleSelections, users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const userId = getUserId(user);
      const selectedRoleId = roleSelections[userId] || "";
      const roleLabel = getSelectedRoleLabel(userId, roleSelections, roles).toLowerCase();
      const haystack = [
        getUserName(user),
        user?.email,
        user?.phoneNumber,
        user?.phone,
        roleLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "ALL" ||
        String(user?.status || "").toUpperCase() === statusFilter;
      const matchesRole = roleFilter === "ALL" || String(selectedRoleId) === String(roleFilter);

      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [query, roleFilter, roleSelections, roles, statusFilter, users]);

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
    Promise.resolve().then(loadData);
  }, [loadData]);

  const handleRoleChange = (userId) => (event) => {
    setRoleSelections((current) => ({
      ...current,
      [userId]: event.target.value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSaveRoles = async (user) => {
    const userId = getUserId(user);
    if (!userId) return;

    const roleId = roleSelections[userId] || "";
    const roleIds = roleId ? [roleId] : [];
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
                  .map((role) => getRoleLabel(role))
                  .filter(Boolean),
              }
            : item,
        ),
      );

      const currentUser = tokenStorage.getUser();
      const currentUserId = getUserId(currentUser);

      if (currentUserId && String(currentUserId) === String(userId)) {
        await authApi.refreshToken().catch(() => authApi.getMe());
        setSuccessMessage("Cap nhat role thanh cong. Token hien tai da duoc lam moi.");
      } else {
        setSuccessMessage("Cap nhat role nguoi dung thanh cong.");
      }
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Cap nhat role nguoi dung that bai."));
    } finally {
      setSavingUserId("");
    }
  };

  const statCards = [
    {
      label: "Tong khach hang",
      value: counts.total,
      note: "Tai khoan trong he thong",
      icon: Users,
      tone: "emerald",
    },
    {
      label: "Co vai tro",
      value: counts.withRole,
      note: "Da phan quyen",
      icon: ShieldCheck,
      tone: "sky",
    },
    {
      label: "Khach hang moi",
      value: counts.newUsers,
      note: "Trong 7 ngay qua",
      icon: UserRound,
      tone: "violet",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">
            Quan ly khach hang
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Quan ly thong tin va phan quyen cua khach hang trong he thong.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Tai lai
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const toneClass =
            card.tone === "sky"
              ? "bg-sky-50 text-sky-700 ring-sky-100"
              : card.tone === "violet"
                ? "bg-violet-50 text-violet-700 ring-violet-100"
                : "bg-emerald-50 text-emerald-700 ring-emerald-100";

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_16px_45px_rgba(15,76,58,0.06)]"
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ring-1 ${toneClass}`}>
                  <Icon className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-black text-neutral-950">{card.value}</p>
                  <p className="mt-1 text-sm text-neutral-500">{card.note}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-[0_16px_45px_rgba(15,76,58,0.07)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_190px_190px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tim kiem theo ten, email, so dien thoai..."
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-600"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          >
            <option value="ALL">Trang thai: Tat ca</option>
            <option value="ACTIVE">Hoat dong</option>
            <option value="INACTIVE">Ngung hoat dong</option>
            <option value="LOCKED">Da khoa</option>
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          >
            <option value="ALL">Vai tro: Tat ca</option>
            {roles.map((role) => {
              const roleId = String(getRoleId(role) || "");
              if (!roleId) return null;

              return (
                <option key={roleId} value={roleId}>
                  {getRoleLabel(role)}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setRoleFilter("ALL");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-bold text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Bo loc
          </button>
        </div>

        <div className="min-h-6 pt-3 text-sm">
          {errorMessage && <p className="font-semibold text-red-600">{errorMessage}</p>}
          {successMessage && <p className="font-semibold text-emerald-600">{successMessage}</p>}
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : filteredUsers.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-100">
            <table className="w-full min-w-[1080px] text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-4 py-4">Khach hang</th>
                  <th className="px-4 py-4">Lien he</th>
                  <th className="px-4 py-4">So dien thoai</th>
                  <th className="px-4 py-4">Trang thai</th>
                  <th className="px-4 py-4">Vai tro</th>
                  <th className="px-4 py-4">Tham gia</th>
                  <th className="px-4 py-4 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((user, index) => {
                  const userId = getUserId(user);
                  const selectedRoleId = roleSelections[userId] || "";
                  const status = user?.status || "-";
                  const isActive = String(status).toUpperCase() === "ACTIVE";
                  const avatarTone = index % 3 === 0 ? "emerald" : index % 3 === 1 ? "sky" : "amber";
                  const avatarClass =
                    avatarTone === "sky"
                      ? "bg-sky-50 text-sky-700 ring-sky-100"
                      : avatarTone === "amber"
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-100";

                  return (
                    <tr key={userId} className="bg-white align-middle hover:bg-emerald-50/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black ring-1 ${avatarClass}`}>
                            {getInitial(user)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-neutral-950">{getUserName(user)}</p>
                            {isNewUser(user) && (
                              <span className="mt-1 inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                Moi
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-neutral-500">
                        {user?.email || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-neutral-500">
                        {user?.phoneNumber || user?.phone || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                            isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-neutral-400"}`} />
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[210px] gap-2">
                          <select
                            value={selectedRoleId}
                            onChange={handleRoleChange(userId)}
                            className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-600"
                          >
                            <option value="">Chon vai tro</option>
                            {roles.map((role) => {
                              const roleId = String(getRoleId(role) || "");
                              if (!roleId) return null;

                              return (
                                <option key={roleId} value={roleId}>
                                  {getRoleLabel(role)}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleSaveRoles(user)}
                            disabled={savingUserId === userId}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Luu role"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold leading-6 text-neutral-500">
                        {formatDate(user?.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/admin/users/${encodeURIComponent(userId)}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-bold text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                        >
                          <Eye className="h-4 w-4" />
                          Chi tiet
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-neutral-200 px-5 py-12 text-center">
            <h3 className="text-sm font-black text-neutral-950">Khong tim thay khach hang</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Thu doi tu khoa tim kiem hoac bo loc hien tai.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminUsers;
