import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  PackageCheck,
  Search,
  WalletCards,
} from "lucide-react";

import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  normalizeOrderStatus,
  orderApi,
} from "../../features/order";
import { formatCurrency } from "../../features/product";
import { getApiMessage } from "../../shared/api";
import { ADMIN_NEW_ORDER_EVENT } from "../../shared/services/adminOrderSocket";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTimeOnly(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getOrderId(order) {
  return order?.id || order?._id || order?.orderId || order?.orderCode;
}

function getCustomerName(order) {
  return (
    order?.receiverName ||
    order?.customerName ||
    order?.user?.username ||
    order?.user?.fullName ||
    order?.guest?.username ||
    "Khach hang"
  );
}

function getCustomerPhone(order) {
  return order?.receiverPhone || order?.phoneNumber || order?.user?.phoneNumber || order?.guest?.phone || "-";
}

function getCustomerType(order) {
  const hasGuestInfo = Boolean(order?.guest || order?.guestEmail || order?.guestUsername || order?.guestName);
  const hasUserInfo = Boolean(order?.userId || order?.user?.id || order?.user?._id || order?.user?.userId);

  return hasGuestInfo || !hasUserInfo ? "GUEST" : "USER";
}

function getCustomerTypeLabel(type) {
  return type === "GUEST" ? "Khach vang lai" : "Khach tai khoan";
}

function getPaymentLabel(method) {
  const normalizedMethod = String(method || "COD").toUpperCase();
  const labels = {
    COD: "COD",
    PAYOS: "Chuyen khoan",
    BANK_TRANSFER: "Chuyen khoan",
    MOMO: "Vi dien tu",
    ZALOPAY: "Vi dien tu",
  };

  return labels[normalizedMethod] || method || "COD";
}

function getPaymentIcon(method) {
  const normalizedMethod = String(method || "COD").toUpperCase();
  if (normalizedMethod === "COD") return Banknote;
  if (normalizedMethod === "MOMO" || normalizedMethod === "ZALOPAY") return WalletCards;
  return BriefcaseBusiness;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const ORDERS_PAGE_LIMIT = 20;

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (first, second) =>
          new Date(second?.createdAt || 0).getTime() -
          new Date(first?.createdAt || 0).getTime(),
      ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedOrders.filter((order) => {
      const haystack = [
        order?.orderCode,
        getOrderId(order),
        getCustomerName(order),
        getCustomerPhone(order),
        getCustomerTypeLabel(getCustomerType(order)),
        order?.receiverAddress,
        order?.paymentStatus,
        getPaymentLabel(order?.paymentMethod),
        ...(Array.isArray(order?.items)
          ? order.items.map((item) => [item?.productName, item?.productId].filter(Boolean).join(" "))
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "ALL" || normalizeOrderStatus(order?.status) === statusFilter;
      const matchesCustomerType =
        customerTypeFilter === "ALL" || getCustomerType(order) === customerTypeFilter;
      const matchesDate = !dateFilter || toDateInputValue(order?.createdAt) === dateFilter;

      return matchesQuery && matchesStatus && matchesCustomerType && matchesDate;
    });
  }, [customerTypeFilter, dateFilter, query, sortedOrders, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => normalizeOrderStatus(order?.status) === "PENDING").length;
    const confirmed = orders.filter((order) => normalizeOrderStatus(order?.status) === "CONFIRMED").length;
    const returned = orders.filter((order) => normalizeOrderStatus(order?.status) === "RETURNED").length;
    const userOrders = orders.filter((order) => getCustomerType(order) === "USER").length;
    const guestOrders = orders.filter((order) => getCustomerType(order) === "GUEST").length;
    const revenue = orders.reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);

    return { total, pending, confirmed, returned, userOrders, guestOrders, revenue };
  }, [orders]);

  const loadOrders = useCallback(async ({ cursor = "", append = false } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setIsLoadingMore(false);
      setOrders([]);
      setNextCursor(null);
      setHasNext(false);
    }
    setErrorMessage("");

    try {
      const page = await orderApi.getAdminOrdersCursor({
        limit: ORDERS_PAGE_LIMIT,
        cursor,
      });

      if (requestIdRef.current !== requestId) return;

      setOrders((currentOrders) => (append ? [...currentOrders, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
      setHasNext(Boolean(page.hasNext && page.nextCursor));
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(getApiMessage(error, "Khong the tai danh sach don hang."));
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadOrders();
    }, query ? 300 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [customerTypeFilter, dateFilter, loadOrders, query, statusFilter]);

  useEffect(() => {
    const handleNewOrder = () => {
      loadOrders();
    };

    window.addEventListener(ADMIN_NEW_ORDER_EVENT, handleNewOrder);

    return () => {
      window.removeEventListener(ADMIN_NEW_ORDER_EVENT, handleNewOrder);
    };
  }, [loadOrders]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !hasNext || !nextCursor) return;

    loadOrders({ cursor: nextCursor, append: true });
  };

  const statCards = [
    {
      label: "Tong don",
      value: stats.total,
      note: `${stats.userOrders} tai khoan / ${stats.guestOrders} vang lai`,
      icon: BriefcaseBusiness,
      tone: "emerald",
    },
    {
      label: "Cho xu ly",
      value: stats.pending,
      note: stats.total ? `${Math.round((stats.pending / stats.total) * 100)}%` : "0%",
      icon: PackageCheck,
      tone: "sky",
    },
    {
      label: "Doanh thu",
      value: formatCurrency(stats.revenue),
      note: "Tong gia tri don",
      icon: WalletCards,
      tone: "violet",
    },
    {
      label: "Da xac nhan",
      value: stats.confirmed,
      note: `${stats.returned} don tra hang`,
      icon: PackageCheck,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">Tat ca don hang</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Quan ly va theo doi tat ca don hang trong he thong.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadOrders()}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Tai lai
        </button>
      </section>

      <section className="grid gap-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-[0_16px_45px_rgba(15,76,58,0.07)] md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const toneClass =
            card.tone === "sky"
              ? "bg-sky-50 text-sky-700 ring-sky-100"
              : card.tone === "violet"
                ? "bg-violet-50 text-violet-700 ring-violet-100"
                : card.tone === "amber"
                  ? "bg-amber-50 text-amber-700 ring-amber-100"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-100";

          return (
            <div
              key={card.label}
              className={`flex items-center gap-4 ${index ? "xl:border-l xl:border-neutral-100 xl:pl-7" : ""}`}
            >
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneClass}`}>
                <Icon className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-500">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">{card.value}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">{card.note}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-[0_16px_45px_rgba(15,76,58,0.07)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[190px_190px_240px_minmax(280px,1fr)_auto_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-600"
          >
            <option value="ALL">Tat ca trang thai</option>
            <option value="PENDING">Cho xu ly</option>
            <option value="CONFIRMED">Da xac nhan</option>
            <option value="CANCELLED">Da huy</option>
            <option value="RETURNED">Da tra hang</option>
          </select>

          <select
            value={customerTypeFilter}
            onChange={(event) => setCustomerTypeFilter(event.target.value)}
            className="h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-600"
          >
            <option value="ALL">Tat ca khach</option>
            <option value="USER">Khach tai khoan</option>
            <option value="GUEST">Khach vang lai</option>
          </select>

          <label className="relative">
            <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 pr-10 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-600"
            />
          </label>

          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tim theo ma don, khach hang..."
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-600"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setCustomerTypeFilter("ALL");
              setDateFilter("");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 text-sm font-bold text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
          >
            <Filter className="h-4 w-4" />
            Bo loc
          </button>

          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-200 px-4 text-neutral-600 hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Tai lai don hang"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : filteredOrders.length ? (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-100">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-4">Don hang</th>
                  <th className="px-5 py-4">Khach hang</th>
                  <th className="px-5 py-4">Trang thai</th>
                  <th className="px-5 py-4">Phuong thuc</th>
                  <th className="px-5 py-4">Tong tien</th>
                  <th className="px-5 py-4">Ngay tao</th>
                  <th className="px-5 py-4 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOrders.map((order, index) => {
                  const orderId = getOrderId(order);
                  const status = normalizeOrderStatus(order?.status);
                  const customerType = getCustomerType(order);
                  const PaymentIcon = getPaymentIcon(order?.paymentMethod);

                  return (
                    <tr key={orderId || index} className="bg-white hover:bg-emerald-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <PackageCheck className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-neutral-950">
                              #{order?.orderCode || orderId || "-"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-neutral-500">
                              {formatDate(order?.createdAt)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-neutral-400">
                              {Array.isArray(order?.items) ? `${order.items.length} san pham` : "0 san pham"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-neutral-950">{getCustomerName(order)}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
                              customerType === "GUEST"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            }`}
                          >
                            {customerType === "GUEST" ? "Guest" : "User"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-neutral-500">{getCustomerPhone(order)}</p>
                        <p className="mt-1 max-w-64 truncate text-xs font-semibold text-neutral-400">
                          {order?.receiverAddress || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getOrderStatusBadgeClass(status)}`}
                        >
                          {getOrderStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                          <PaymentIcon className="h-4 w-4" />
                          {getPaymentLabel(order?.paymentMethod)}
                        </span>
                        <p className="mt-2 text-xs font-semibold text-neutral-500">
                          {order?.paymentStatus || "UNPAID"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-neutral-950">
                        {formatCurrency(order?.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold leading-6 text-neutral-500">
                        <span className="block">{formatDateOnly(order?.createdAt)}</span>
                        <span className="block">{formatTimeOnly(order?.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/orders/${orderId}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                            aria-label="Xem chi tiet don hang"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:border-emerald-600 hover:text-emerald-700"
                            aria-label="Thao tac khac"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-center border-t border-neutral-100 bg-white px-5 py-4">
              {hasNext && nextCursor ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoading || isLoadingMore}
                  className="inline-flex h-11 min-w-36 items-center justify-center rounded-xl border border-emerald-200 px-5 text-sm font-black text-emerald-700 hover:border-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? "Dang tai..." : "Tai them"}
                </button>
              ) : (
                <p className="text-sm font-semibold text-neutral-400">Da tai het don hang</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 px-5 py-14 text-center">
            <h3 className="text-sm font-black text-neutral-950">Khong tim thay don hang</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Thu doi tu khoa tim kiem hoac bo loc hien tai.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminOrders;
