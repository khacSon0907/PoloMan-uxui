import { useEffect, useMemo, useState } from "react";

import { orderApi } from "../../features/order";
import { formatCurrency } from "../../features/product";
import { getApiMessage } from "../../shared/api";

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

function getOrderId(order) {
  return order?.id || order?._id || order?.orderId || order?.orderCode;
}

function getStatusLabel(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  const labels = {
    PENDING: "Cho xac nhan",
    CONFIRMED: "Da xac nhan",
    SHIPPING: "Dang giao",
    DELIVERED: "Da giao",
    COMPLETED: "Hoan thanh",
    CANCELLED: "Da huy",
  };

  return labels[normalizedStatus] || status || "Cho xac nhan";
}

function getPaymentLabel(method) {
  const normalizedMethod = String(method || "").toUpperCase();
  const labels = {
    COD: "COD",
    MOMO: "Momo",
    PAYOS: "PayOS",
    BANK_TRANSFER: "Ngan hang",
  };

  return labels[normalizedMethod] || method || "COD";
}

function getCustomerText(order) {
  return (
    order?.receiverName ||
    order?.customerName ||
    order?.user?.fullName ||
    order?.user?.username ||
    order?.user?.email ||
    order?.userId ||
    "-"
  );
}

function getItemsCount(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
}

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (order) => String(order?.status || "").toUpperCase() === "PENDING",
    ).length;
    const revenue = orders.reduce(
      (sum, order) => sum + Number(order?.totalAmount || 0),
      0,
    );

    return { total, pending, revenue };
  }, [orders]);

  const loadOrders = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const list = await orderApi.getAllOrders();
      setOrders(
        [...list].sort(
          (first, second) =>
            new Date(second?.createdAt || 0).getTime() -
            new Date(first?.createdAt || 0).getTime(),
        ),
      );
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the tai danh sach don hang."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    orderApi
      .getAllOrders()
      .then((list) => {
        if (!isMounted) return;
        setOrders(
          [...list].sort(
            (first, second) =>
              new Date(second?.createdAt || 0).getTime() -
              new Date(first?.createdAt || 0).getTime(),
          ),
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(getApiMessage(error, "Khong the tai danh sach don hang."));
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
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_520px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Order manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Tat ca don hang
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Hien thi toan bo don hang tu API GET /api/orders de admin theo doi
              khach hang, trang thai va tong tien.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong don</p>
              <p className="mt-2 text-3xl font-black">{stats.total}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Cho xu ly</p>
              <p className="mt-2 text-3xl font-black">{stats.pending}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Doanh thu</p>
              <p className="mt-2 text-xl font-black">{formatCurrency(stats.revenue)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-h-5 text-sm">
            {errorMessage && (
              <p className="font-medium text-red-600">{errorMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 hover:border-emerald-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tai lai
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Don hang</th>
                  <th className="px-5 py-3">Khach hang</th>
                  <th className="px-5 py-3">Lien he</th>
                  <th className="px-5 py-3">San pham</th>
                  <th className="px-5 py-3">Thanh toan</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="px-5 py-3 text-right">Tong tien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order, index) => {
                  const status = String(order?.status || "PENDING").toUpperCase();

                  return (
                    <tr
                      key={getOrderId(order) || index}
                      className="bg-white transition-colors hover:bg-emerald-50/45"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-950">
                          #{order?.orderCode || getOrderId(order) || "-"}
                        </div>
                        <div className="mt-1 text-sm text-neutral-500">
                          {formatDate(order?.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-950">
                          {getCustomerText(order)}
                        </div>
                        <div className="mt-1 max-w-[260px] truncate text-sm text-neutral-500">
                          {order?.receiverAddress || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {order?.receiverPhone || order?.user?.phoneNumber || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">
                        {getItemsCount(order)} san pham
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-neutral-950">
                          {getPaymentLabel(order?.paymentMethod)}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-neutral-500">
                          {order?.paymentStatus || "UNPAID"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            status === "CANCELLED"
                              ? "border-red-200 bg-red-50 text-red-600"
                              : status === "PENDING"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {getStatusLabel(order?.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-black text-neutral-950">
                        {formatCurrency(order?.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co don hang
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              API chua tra ve don hang nao cho admin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminOrders;
