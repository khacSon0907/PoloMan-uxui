import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Fingerprint,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { roleApi } from "../../features/role";
import { addressApi, userApi } from "../../features/user";
import { getApiMessage, normalizeRoles } from "../../shared/api";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN");
}

function getUserId(user) {
  return user?.id || user?._id || user?.userId || user?.username || user?.email;
}

function getRoleId(role) {
  return role?.id || role?._id || role?.roleId;
}

function getRoleLabel(role) {
  return role?.code || role?.name || String(getRoleId(role) || "");
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

function getUserRoleLabels(user, roles) {
  const roleIds = normalizeRoleIds(user?.roleIds);

  if (roleIds.length) {
    return roleIds
      .map((roleId) => roles.find((role) => String(getRoleId(role)) === String(roleId)))
      .filter(Boolean)
      .map(getRoleLabel);
  }

  return normalizeRoles(user?.roles || user?.role);
}

function getAddress(user) {
  if (!user) return "-";
  if (typeof user.address === "string") return user.address;

  return (
    user?.address?.streetAddress ||
    user?.address?.detail ||
    user?.streetAddress ||
    user?.shippingAddress ||
    user?.defaultAddress ||
    "-"
  );
}

function formatAddress(address) {
  if (!address) return "-";
  if (typeof address === "string") return address;

  return [
    address.streetAddress || address.address,
    address.wardName || address.ward,
    address.districtName || address.district,
    address.provinceName || address.province,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

function findUserByParam(users, userId) {
  const decodedUserId = decodeURIComponent(userId || "");

  return users.find((user) => {
    const candidates = [
      getUserId(user),
      user?.id,
      user?._id,
      user?.userId,
      user?.username,
      user?.email,
    ];

    return candidates.some((candidate) => String(candidate || "") === decodedUserId);
  });
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-400">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-3 break-words text-sm font-bold leading-6 text-neutral-950">{value || "-"}</p>
    </div>
  );
}

function AdminUserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [addressErrorMessage, setAddressErrorMessage] = useState("");
  const roleLabels = useMemo(() => getUserRoleLabels(user, roles), [roles, user]);
  const isActive = String(user?.status || "").toUpperCase() === "ACTIVE";

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoading(true);
      setErrorMessage("");
    });

    Promise.all([userApi.getAll(), roleApi.list()])
      .then(async ([userList, roleList]) => {
        if (!isMounted) return;

        const nextUsers = Array.isArray(userList) ? userList : [];
        const nextRoles = Array.isArray(roleList) ? roleList : [];
        const foundUser = findUserByParam(nextUsers, userId);

        setRoles(nextRoles);
        setUser(foundUser || null);
        setAddresses([]);
        setAddressErrorMessage("");

        if (!foundUser) {
          setErrorMessage("Khong tim thay khach hang.");
          return;
        }

        setIsLoadingAddresses(true);
        try {
          const addressList = await addressApi.getAddresses(getUserId(foundUser));
          if (isMounted) setAddresses(Array.isArray(addressList) ? addressList : []);
        } catch (error) {
          if (isMounted) {
            setAddressErrorMessage(getApiMessage(error, "Khong the tai dia chi cua khach hang."));
          }
        } finally {
          if (isMounted) setIsLoadingAddresses(false);
        }
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, "Khong the tai chi tiet khach hang."));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-3xl border border-neutral-100 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
      </div>
    );
  }

  if (errorMessage || !user) {
    return (
      <section className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-black text-neutral-950">Khong tim thay khach hang</h1>
        <p className="mt-2 text-sm font-semibold text-red-600">{errorMessage || "Du lieu khong ton tai."}</p>
        <Link
          to="/admin/users"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Ve danh sach
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-emerald-700/65">
            <Link to="/admin/users" className="font-bold hover:text-emerald-900">
              Khach hang
            </Link>
            <span className="mx-2">/</span>
            <span>Chi tiet</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
            Chi tiet khach hang
          </h1>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-emerald-200 px-5 text-sm font-black text-emerald-700 hover:border-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai
        </Link>
      </section>

      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_16px_45px_rgba(15,76,58,0.08)]">
        <div className="bg-emerald-700 px-6 py-7 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-black text-emerald-700">
                {getInitial(user)}
              </span>
              <div>
                <h2 className="text-3xl font-black">{getUserName(user)}</h2>
                <p className="mt-2 text-sm font-semibold text-white/70">{user.email || "Chua co email"}</p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                isActive ? "bg-white text-emerald-700" : "bg-white/15 text-white"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-600" : "bg-white/60"}`} />
              {getStatusLabel(user.status)}
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailCard icon={Mail} label="Email" value={user.email} />
              <DetailCard icon={Phone} label="So dien thoai" value={user.phoneNumber || user.phone} />
              <DetailCard icon={CalendarDays} label="Ngay tham gia" value={formatDate(user.createdAt)} />
              <DetailCard icon={BadgeCheck} label="Trang thai" value={getStatusLabel(user.status)} />
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-400">
                <MapPin className="h-4 w-4" />
                Dia chi giao hang
              </p>
              {isLoadingAddresses ? (
                <div className="mt-4 flex min-h-24 items-center justify-center rounded-xl bg-neutral-50">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
                </div>
              ) : addressErrorMessage ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {addressErrorMessage}
                </div>
              ) : addresses.length ? (
                <div className="mt-4 space-y-3">
                  {addresses.map((address, index) => (
                    <div
                      key={address.id || address._id || `${formatAddress(address)}-${index}`}
                      className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-neutral-950">
                            {address.receiverName || user.fullName || getUserName(user)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-neutral-500">
                            {address.receiverPhone || user.phoneNumber || user.phone || "-"}
                          </p>
                        </div>
                        {address.isDefault && (
                          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            Mac dinh
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-bold leading-6 text-neutral-950">
                        {formatAddress(address)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-neutral-500">
                    Khach hang chua co dia chi rieng. Thong tin tren tai khoan: {getAddress(user)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-400">
                <ShieldCheck className="h-4 w-4" />
                Vai tro
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {roleLabels.length ? (
                  roleLabels.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-neutral-500">Chua phan role</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-400">
                <Fingerprint className="h-4 w-4" />
                Dinh danh
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-bold text-neutral-400">User ID</p>
                  <p className="mt-1 break-all font-black text-neutral-950">{getUserId(user)}</p>
                </div>
                <div>
                  <p className="font-bold text-neutral-400">Username</p>
                  <p className="mt-1 break-all font-black text-neutral-950">{user.username || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-neutral-400">Ho ten</p>
                  <p className="mt-1 break-all font-black text-neutral-950">
                    {user.fullName || user.name || "-"}
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/admin/users"
              className="flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800"
            >
              Ve danh sach khach hang
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default AdminUserDetail;
