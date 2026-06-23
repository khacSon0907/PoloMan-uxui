import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  Tags,
  TrendingUp,
  Users,
} from "lucide-react";

import { revenueApi } from "../../shared/api";

const TOP_PRODUCTS_LIMIT_OPTIONS = [5, 10, 20];

function getTodayDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function normalizeTopProductsResponse(response) {
  const payload = unwrapResponse(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;

  return [];
}

function getNumericValue(data, keys = []) {
  if (typeof data === "number") return data;

  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
}

function formatDateDisplay(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return day ? `${day}/${month}/${year}` : `${month}/${year}`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Không thể tải dữ liệu"
  );
}

function getRevenueAmount(data) {
  return getNumericValue(data, [
    "revenue",
    "totalRevenue",
    "total",
    "amount",
    "value",
    "dailyRevenue",
    "weeklyRevenue",
    "monthlyRevenue",
  ]);
}

function getOrderCount(data) {
  return getNumericValue(data, [
    "orderCount",
    "orders",
    "totalOrders",
    "numberOfOrders",
    "count",
    "quantity",
  ]);
}

function getProductName(product) {
  return (
    product?.productName ||
    product?.name ||
    product?.title ||
    product?.product?.name ||
    "Sản phẩm chưa đặt tên"
  );
}

function getProductCode(product) {
  return product?.sku || product?.productCode || product?.code || product?.product?.sku || "-";
}

function getProductSold(product) {
  return getNumericValue(product, ["sold", "soldQuantity", "quantity", "totalSold", "totalQuantity"]);
}

function getProductRevenue(product) {
  return getNumericValue(product, ["revenue", "totalRevenue", "amount", "totalAmount", "sales"]);
}

function SummaryCard({ title, value, description, icon: Icon, tone, isLoading }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-500">{title}</p>
          <p className="text-2xl font-black tracking-tight text-neutral-950">
            {isLoading ? "Đang tải..." : value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={21} strokeWidth={2.4} />
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-neutral-500">{description}</p>
    </article>
  );
}

function LoadingBar({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
    </div>
  );
}

function AdminDashboard() {
  const [dailyDate, setDailyDate] = useState(getTodayDateString);
  const [weeklyDate, setWeeklyDate] = useState(getTodayDateString);
  const [monthlyDate, setMonthlyDate] = useState(getCurrentMonthString);
  const [topProductsLimit, setTopProductsLimit] = useState(10);

  const [dailyData, setDailyData] = useState({ loading: true, error: "", data: null });
  const [weeklyData, setWeeklyData] = useState({ loading: true, error: "", data: null });
  const [monthlyData, setMonthlyData] = useState({ loading: true, error: "", data: null });
  const [totalData, setTotalData] = useState({ loading: true, error: "", data: null });
  const [topProductsData, setTopProductsData] = useState({ loading: true, error: "", data: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const monthlyApiDate = useMemo(() => `${monthlyDate}-01`, [monthlyDate]);

  const fetchDaily = useCallback(async (date) => {
    setDailyData((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await revenueApi.getDailyRevenue(date);
      setDailyData({ loading: false, error: "", data: unwrapResponse(response) });
    } catch (error) {
      setDailyData({ loading: false, error: getErrorMessage(error), data: null });
    }
  }, []);

  const fetchWeekly = useCallback(async (date) => {
    setWeeklyData((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await revenueApi.getWeeklyRevenue(date);
      setWeeklyData({ loading: false, error: "", data: unwrapResponse(response) });
    } catch (error) {
      setWeeklyData({ loading: false, error: getErrorMessage(error), data: null });
    }
  }, []);

  const fetchMonthly = useCallback(async (date) => {
    setMonthlyData((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await revenueApi.getMonthlyRevenue(date);
      setMonthlyData({ loading: false, error: "", data: unwrapResponse(response) });
    } catch (error) {
      setMonthlyData({ loading: false, error: getErrorMessage(error), data: null });
    }
  }, []);

  const fetchTotal = useCallback(async () => {
    setTotalData((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await revenueApi.getTotalRevenue();
      setTotalData({ loading: false, error: "", data: unwrapResponse(response) });
    } catch (error) {
      setTotalData({ loading: false, error: getErrorMessage(error), data: null });
    }
  }, []);

  const fetchTopProducts = useCallback(async (limit) => {
    setTopProductsData((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await revenueApi.getTopSellingProducts(limit);
      setTopProductsData({
        loading: false,
        error: "",
        data: normalizeTopProductsResponse(response),
      });
    } catch (error) {
      setTopProductsData({ loading: false, error: getErrorMessage(error), data: [] });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);

    await Promise.all([
      fetchDaily(dailyDate),
      fetchWeekly(weeklyDate),
      fetchMonthly(monthlyApiDate),
      fetchTotal(),
      fetchTopProducts(topProductsLimit),
    ]);

    setIsRefreshing(false);
  }, [
    dailyDate,
    fetchDaily,
    fetchMonthly,
    fetchTopProducts,
    fetchTotal,
    fetchWeekly,
    monthlyApiDate,
    topProductsLimit,
    weeklyDate,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchDaily(dailyDate);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [dailyDate, fetchDaily]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchWeekly(weeklyDate);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [weeklyDate, fetchWeekly]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchMonthly(monthlyApiDate);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [monthlyApiDate, fetchMonthly]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTotal();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchTotal]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTopProducts(topProductsLimit);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchTopProducts, topProductsLimit]);

  const totalRevenue = getRevenueAmount(totalData.data);
  const dailyRevenue = getRevenueAmount(dailyData.data);
  const weeklyRevenue = getRevenueAmount(weeklyData.data);
  const monthlyRevenue = getRevenueAmount(monthlyData.data);

  const dashboardErrors = [
    dailyData.error && `Doanh thu ngày: ${dailyData.error}`,
    weeklyData.error && `Doanh thu tuần: ${weeklyData.error}`,
    monthlyData.error && `Doanh thu tháng: ${monthlyData.error}`,
    totalData.error && `Tổng doanh thu: ${totalData.error}`,
    topProductsData.error && `Sản phẩm bán chạy: ${topProductsData.error}`,
  ].filter(Boolean);

  const quickLinks = [
    { to: "/admin/orders", label: "Quản lý đơn hàng", icon: ShoppingBag },
    { to: "/admin/products", label: "Quản lý sản phẩm", icon: Package },
    { to: "/admin/categories", label: "Quản lý danh mục", icon: Tags },
    { to: "/admin/users", label: "Quản lý khách hàng", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <BarChart3 size={14} />
              Trang quản trị
            </p>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-950">
                Tổng quan bán hàng
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-neutral-500">
                Theo dõi doanh thu, số đơn và sản phẩm bán chạy từ dữ liệu hệ thống.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={17} className={isRefreshing ? "animate-spin" : ""} />
            Làm mới dữ liệu
          </button>
        </div>
      </header>

      {dashboardErrors.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-black">Một số dữ liệu chưa tải được</p>
              {dashboardErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Doanh thu hôm nay"
          value={formatCurrency(dailyRevenue)}
          description={`Ngày ${formatDateDisplay(dailyDate)} - ${formatNumber(getOrderCount(dailyData.data))} đơn`}
          icon={Clock3}
          tone="bg-emerald-50 text-emerald-700"
          isLoading={dailyData.loading}
        />
        <SummaryCard
          title="Doanh thu trong tuần"
          value={formatCurrency(weeklyRevenue)}
          description={`Mốc tuần từ ngày ${formatDateDisplay(weeklyDate)} - ${formatNumber(getOrderCount(weeklyData.data))} đơn`}
          icon={CalendarDays}
          tone="bg-sky-50 text-sky-700"
          isLoading={weeklyData.loading}
        />
        <SummaryCard
          title="Doanh thu trong tháng"
          value={formatCurrency(monthlyRevenue)}
          description={`Tháng ${formatDateDisplay(monthlyDate)} - ${formatNumber(getOrderCount(monthlyData.data))} đơn`}
          icon={TrendingUp}
          tone="bg-indigo-50 text-indigo-700"
          isLoading={monthlyData.loading}
        />
        <SummaryCard
          title="Tổng doanh thu"
          value={formatCurrency(totalRevenue)}
          description={`Tổng cộng ${formatNumber(getOrderCount(totalData.data))} đơn đã ghi nhận`}
          icon={DollarSign}
          tone="bg-amber-50 text-amber-700"
          isLoading={totalData.loading}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-neutral-950">Bộ lọc doanh thu</h2>
                <p className="mt-1 text-sm font-medium text-neutral-500">
                  Chọn ngày hoặc tháng để xem số liệu tương ứng từ API.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-xs font-black uppercase tracking-wide text-neutral-500">
                  Theo ngày
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(event) => setDailyDate(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-xs font-black uppercase tracking-wide text-neutral-500">
                  Theo tuần
                  <input
                    type="date"
                    value={weeklyDate}
                    onChange={(event) => setWeeklyDate(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-xs font-black uppercase tracking-wide text-neutral-500">
                  Theo tháng
                  <input
                    type="month"
                    value={monthlyDate}
                    onChange={(event) => setMonthlyDate(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-500">Ngày đang xem</p>
              <p className="mt-2 text-lg font-black text-neutral-950">{formatDateDisplay(dailyDate)}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{formatCurrency(dailyRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-500">Tuần đang xem</p>
              <p className="mt-2 text-lg font-black text-neutral-950">{formatDateDisplay(weeklyDate)}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{formatCurrency(weeklyRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-500">Tháng đang xem</p>
              <p className="mt-2 text-lg font-black text-neutral-950">{formatDateDisplay(monthlyDate)}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{formatCurrency(monthlyRevenue)}</p>
            </div>
          </div>
        </article>

        <aside className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-neutral-950">Truy cập nhanh</h2>
          <div className="mt-5 space-y-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 text-sm font-black text-neutral-800 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-800"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {item.label}
                  </span>
                  <ArrowRight size={17} />
                </Link>
              );
            })}
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-neutral-950">Sản phẩm bán chạy</h2>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                Danh sách sản phẩm có doanh thu hoặc số lượng bán cao nhất.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-neutral-600">
              Hiển thị
              <select
                value={topProductsLimit}
                onChange={(event) => setTopProductsLimit(Number(event.target.value))}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-black text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                {TOP_PRODUCTS_LIMIT_OPTIONS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit} sản phẩm
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4">
            <LoadingBar isVisible={topProductsData.loading} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-black uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-4">Sản phẩm</th>
                <th className="px-5 py-4">Mã sản phẩm</th>
                <th className="px-5 py-4 text-right">Đã bán</th>
                <th className="px-5 py-4 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {topProductsData.data.length > 0 ? (
                topProductsData.data.map((product, index) => (
                  <tr key={product?.id || product?.productId || product?.sku || index}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700">
                          {index + 1}
                        </span>
                        <span className="font-black text-neutral-950">{getProductName(product)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-neutral-500">{getProductCode(product)}</td>
                    <td className="px-5 py-4 text-right font-black text-neutral-900">
                      {formatNumber(getProductSold(product))}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-700">
                      {formatCurrency(getProductRevenue(product))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-5 py-12 text-center">
                    <p className="text-base font-black text-neutral-700">Chưa có dữ liệu sản phẩm bán chạy</p>
                    <p className="mt-1 text-sm font-medium text-neutral-500">
                      Hãy kiểm tra lại API doanh thu hoặc tạo thêm đơn hàng thành công.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
