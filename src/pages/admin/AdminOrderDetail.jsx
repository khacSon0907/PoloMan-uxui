import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  canCancelOrder,
  canReturnOrder,
  getOrderBusinessMessage,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  isPendingOrder,
  orderApi,
} from "../../features/order";
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

function getItemKey(item, index) {
  return [item.productId, item.colorId, item.sizeId, index].filter(Boolean).join("-");
}

function AdminOrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const statusOptions = useMemo(() => {
    if (canCancelOrder(order?.status)) {
      return [
        { value: "CONFIRMED", label: "Đã xác nhận" },
        { value: "CANCELLED", label: "Đã hủy" },
      ];
    }

    if (canReturnOrder(order?.status)) {
      return [{ value: "RETURNED", label: "Đã trả hàng" }];
    }

    return [];
  }, [order?.status]);

  const loadOrder = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await orderApi.getOrder(orderId);
      setOrder(data);
      setNextStatus("");
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the tai chi tiet don hang."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
    });

    orderApi
      .getOrder(orderId)
      .then((data) => {
        if (isMounted) {
          setOrder(data);
          setNextStatus("");
        }
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, "Khong the tai chi tiet don hang."));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleUpdateStatus = async () => {
    const id = order?.id || order?.orderId || orderId;
    if (!id || !nextStatus) return;

    setIsUpdatingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (nextStatus === "CONFIRMED" && isPendingOrder(order?.status)) {
        await orderApi.confirmOrder(id);
        setSuccessMessage("Đã xác nhận đơn hàng.");
      } else if (nextStatus === "CANCELLED" && canCancelOrder(order?.status)) {
        const cancelReason = window.prompt("Nhap ly do huy don hang:", "Admin huy don hang") || "";
        await orderApi.cancelOrder(id, cancelReason);
        setSuccessMessage("Đã hủy đơn hàng.");
      } else if (nextStatus === "RETURNED" && canReturnOrder(order?.status)) {
        await orderApi.returnOrder(id);
        setSuccessMessage("Đã chuyển đơn sang trạng thái trả hàng.");
      } else {
        setErrorMessage("Không thể chuyển sang trạng thái này.");
        return;
      }

      await loadOrder();
    } catch (error) {
      setErrorMessage(getOrderBusinessMessage(error, "Không thể cập nhật trạng thái đơn hàng."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-emerald-700/65">
            <Link to="/admin/orders" className="font-semibold hover:text-emerald-900">
              Don hang
            </Link>
            <span className="mx-2">/</span>
            <span>Chi tiet</span>
          </p>
          <h1 className="mt-2 text-2xl font-black text-neutral-950 sm:text-3xl">
            Don hang #{order?.orderCode || order?.id || orderId}
          </h1>
        </div>
        <Link
          to="/admin/orders"
          className="h-10 w-fit rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-500 hover:text-emerald-800"
        >
          Quay lai
        </Link>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      ) : order ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="bg-emerald-700 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                  Trang thai don
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-2xl font-black">{getOrderStatusLabel(order.status)}</p>
                    <p className="mt-1 text-sm text-white/70">Tao luc {formatDate(order.createdAt)}</p>
                  </div>
                  <span className="rounded-xl bg-white/15 px-4 py-3 text-sm font-black text-white">
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700/65">Trang thai</p>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${getOrderStatusBadgeClass(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700/65">Thanh toan</p>
                  <p className="mt-3 text-sm font-black text-emerald-950">
                    {getPaymentLabel(order.paymentMethod)} / {order.paymentStatus || "UNPAID"}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700/65">Tong tien</p>
                  <p className="mt-3 text-lg font-black text-emerald-950">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">San pham trong don</h2>
              <div className="mt-4 divide-y divide-emerald-100">
                {items.length ? (
                  items.map((item, index) => (
                    <div key={getItemKey(item, index)} className="grid gap-3 py-4 sm:grid-cols-[1fr_90px_140px] sm:items-center">
                      <div>
                        <p className="text-sm font-black text-neutral-950">
                          {item.productName || item.productId || "San pham"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.colorName || "Mau -"} / {item.sizeName || "Size -"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-neutral-600">
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-neutral-700">x{Number(item.quantity || 0)}</p>
                      <p className="text-sm font-black text-neutral-950 sm:text-right">
                        {formatCurrency(item.totalPrice || Number(item.unitPrice || 0) * Number(item.quantity || 0))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm font-semibold text-neutral-500">Don hang chua co san pham.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">Cập nhật trạng thái</h2>
              {statusOptions.length ? (
                <div className="mt-4 space-y-3">
                  <select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    className="h-12 w-full rounded-xl border border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-950 outline-none focus:border-emerald-600"
                  >
                    <option value="">Chọn trạng thái tiếp theo</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={!nextStatus || isUpdatingStatus}
                    className="h-11 w-full rounded-xl bg-emerald-700 px-5 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingStatus ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                  </button>
                  <p className="text-xs font-semibold leading-5 text-neutral-500">
                    PENDING có thể xác nhận hoặc hủy. CONFIRMED có thể chuyển sang trả hàng.
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                  Đơn hàng đã ở trạng thái cuối, không thể chuyển tiếp.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">Giao hang</h2>
              <div className="mt-4 space-y-4 text-sm text-neutral-600">
                <p>
                  <span className="font-bold text-neutral-950">Nguoi nhan:</span>{" "}
                  {order.receiverName || "-"}
                </p>
                <p>
                  <span className="font-bold text-neutral-950">SDT:</span>{" "}
                  {order.receiverPhone || "-"}
                </p>
                <p className="leading-6">
                  <span className="font-bold text-neutral-950">Dia chi:</span>{" "}
                  {order.receiverAddress || "-"}
                </p>
                {order.note && (
                  <p className="leading-6">
                    <span className="font-bold text-neutral-950">Ghi chu:</span>{" "}
                    {order.note}
                  </p>
                )}
                {order.cancelReason && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-600">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">Ly do huy</p>
                    <p className="mt-1 leading-6">{order.cancelReason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-emerald-950">Tong ket</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-neutral-600">
                  <span>Tam tinh</span>
                  <span className="font-bold text-neutral-950">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 text-neutral-600">
                  <span>Phi van chuyen</span>
                  <span className="font-bold text-neutral-950">{formatCurrency(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between gap-4 text-neutral-600">
                  <span>Giam gia</span>
                  <span className="font-bold text-neutral-950">-{formatCurrency(order.discountAmount)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-emerald-100 pt-4 text-lg font-black text-emerald-950">
                  <span>Tong tien</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-neutral-700">Khong tim thay don hang.</p>
        </div>
      )}
    </div>
  );
}

export default AdminOrderDetail;
