import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  MoreVertical,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import {
  categoryApi,
  flattenCategoryTree,
  normalizeCategoryTree,
} from "../../features/category";
import {
  formatCurrency,
  getProductId,
  getProductImage,
  getProductStock,
  productApi,
} from "../../features/product";
import { getApiMessage } from "../../shared/api";

const ADMIN_PRODUCTS_LIMIT = 20;

function getProductImageCount(product) {
  const colors = product?.colors || product?.colorVariants || [];

  return colors.reduce((sum, color) => {
    const images = color?.images || [];
    return sum + images.length;
  }, product?.images?.length || 0);
}

function getProductCategoryId(product) {
  return product?.category?.id || product?.category?._id || product?.categoryId || "";
}

function getStockLabel(stock) {
  if (stock <= 0) return "Het hang";
  if (stock <= 10) return "Sap het";
  return "Con hang";
}

function getStockClass(stock) {
  if (stock <= 0) return "text-red-600";
  if (stock <= 10) return "text-amber-600";
  return "text-emerald-600";
}

function getFirstSku(product) {
  const colors = product?.colors || product?.colorVariants || [];
  const firstSize = colors.flatMap((color) => color?.sizes || color?.sizeVariants || [])[0];

  return firstSize?.sku || product?.sku || "AUTO-SKU";
}

function AdminProducts() {
  const navigate = useNavigate();
  const loadMoreRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const productsRequestSeq = useRef(0);
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const isLoading = isLoadingInitial || isLoadingMore;

  const categoryOptions = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );
  const categoryNameById = useMemo(
    () =>
      new Map(
        categoryOptions
          .filter((category) => category.id)
          .map((category) => [String(category.id), category.name]),
      ),
    [categoryOptions],
  );
  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + getProductStock(product), 0),
    [products],
  );
  const activeCount = useMemo(
    () => products.filter((product) => product.active !== false).length,
    [products],
  );
  const hiddenCount = Math.max(products.length - activeCount, 0);
  const outOfStockCount = useMemo(
    () => products.filter((product) => getProductStock(product) <= 0).length,
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const stock = getProductStock(product);
      const matchesQuery =
        !normalizedQuery ||
        [product?.name, product?.slug, getFirstSku(product)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active !== false) ||
        (statusFilter === "hidden" && product.active === false);
      const categoryId = getProductCategoryId(product);
      const matchesCategory =
        selectedCategoryId === "all" || String(categoryId) === String(selectedCategoryId);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && stock > 10) ||
        (stockFilter === "low-stock" && stock > 0 && stock <= 10) ||
        (stockFilter === "out-of-stock" && stock <= 0);

      return matchesQuery && matchesStatus && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategoryId, statusFilter, stockFilter]);

  const handleProductRequestError = useCallback(
    (requestError) => {
      const status = requestError?.response?.status || requestError?.status;

      if (status === 401) {
        setError("Phien dang nhap da het han. Vui long dang nhap lai.");
        navigate("/login", { replace: true, state: { from: { pathname: "/admin/products" } } });
        return;
      }

      if (status === 403) {
        setError("Tai khoan khong co quyen quan tri san pham.");
        return;
      }

      setError(getApiMessage(requestError, "Khong the tai danh sach san pham."));
    },
    [navigate],
  );

  const loadProductsPage = useCallback(
    async ({ cursor = null, reset = false } = {}) => {
      if (!reset && (!cursor || isLoadingMoreRef.current)) return;

      const requestId = reset ? productsRequestSeq.current + 1 : productsRequestSeq.current;
      productsRequestSeq.current = requestId;

      if (reset) {
        isLoadingMoreRef.current = false;
        setIsLoadingInitial(true);
        setIsLoadingMore(false);
        setProducts([]);
        setNextCursor(null);
        setHasNext(false);
      } else {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const page = await productApi.getAdminProductsByCursor({
          cursor,
          limit: ADMIN_PRODUCTS_LIMIT,
        });
        const items = Array.isArray(page.items) ? page.items : [];

        if (requestId !== productsRequestSeq.current) return;

        setProducts((current) => {
          if (reset) return items;

          const seen = new Set(current.map((product) => String(getProductId(product))));
          const nextItems = items.filter((product) => {
            const productId = String(getProductId(product));
            if (!productId || seen.has(productId)) return false;
            seen.add(productId);
            return true;
          });

          return [...current, ...nextItems];
        });
        setNextCursor(page.nextCursor || null);
        setHasNext(Boolean(page.hasNext && page.nextCursor));
      } catch (requestError) {
        handleProductRequestError(requestError);
      } finally {
        if (reset) {
          setIsLoadingInitial(false);
        } else {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [handleProductRequestError],
  );

  useEffect(() => {
    let isMounted = true;

    categoryApi
      .list()
      .then((categoryList) => {
        if (isMounted) {
          setCategories(normalizeCategoryTree(categoryList));
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(getApiMessage(requestError, "Khong the tai danh muc san pham."));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadProductsPage({ reset: true }));
  }, [loadProductsPage]);

  useEffect(() => {
    const trigger = loadMoreRef.current;

    if (!trigger || !hasNext || !nextCursor || isLoading) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadProductsPage({ cursor: nextCursor });
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(trigger);

    return () => observer.disconnect();
  }, [hasNext, isLoading, loadProductsPage, nextCursor]);

  const refreshProducts = () => {
    loadProductsPage({ reset: true });
  };

  const handleLoadMore = () => {
    if (!hasNext || !nextCursor || isLoading) return;
    loadProductsPage({ cursor: nextCursor });
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    loadProductsPage({ reset: true });
  };

  const handleSelectStatus = (status) => {
    setStatusFilter(status);
    loadProductsPage({ reset: true });
  };

  const handleSelectStock = (stock) => {
    setStockFilter(stock);
    loadProductsPage({ reset: true });
  };

  const handleConfirmDelete = async () => {
    const productId = getProductId(productToDelete);

    if (!productId) return;

    setIsDeleting(true);
    setError(null);

    try {
      await productApi.delete(productId);
      setProducts((current) =>
        current.filter((product) => String(getProductId(product)) !== String(productId)),
      );
      setProductToDelete(null);
    } catch (requestError) {
      setError(getApiMessage(requestError, "Khong the xoa san pham."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              Quan ly san pham
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Trang chu <span className="mx-2 text-neutral-300">&gt;</span>{" "}
              <span className="font-semibold text-emerald-700">San pham</span>
            </p>
          </div>
          <Link
            to="/admin/products/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm shadow-emerald-900/15 hover:bg-emerald-800"
          >
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            Tao san pham moi
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Package size={25} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-500">Tong san pham</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">{products.length}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">Da tai</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Eye size={25} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-500">Dang hien thi</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">{activeCount}</p>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  {products.length ? Math.round((activeCount / products.length) * 100) : 0}% san pham da tai
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <EyeOff size={25} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-500">Tam an</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">{hiddenCount}</p>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  {products.length ? Math.round((hiddenCount / products.length) * 100) : 0}% san pham da tai
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={25} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-500">Het hang</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">{outOfStockCount}</p>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  Ton kho tong: {totalStock}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.35fr)_220px_220px_220px_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-bold text-neutral-500">Tim kiem</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tim kiem theo ten san pham, SKU..."
                className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-neutral-500">Danh muc</span>
              <select
                value={selectedCategoryId}
                onChange={(event) => handleSelectCategory(event.target.value)}
                disabled={isLoadingCategories || isLoading}
                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-neutral-50"
              >
                <option value="all">Tat ca danh muc</option>
                {categoryOptions.map((category) => (
                  <option key={category.id || category.slug || category.name} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-neutral-500">Trang thai</span>
              <select
                value={statusFilter}
                onChange={(event) => handleSelectStatus(event.target.value)}
                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">Tat ca trang thai</option>
                <option value="active">Dang hien thi</option>
                <option value="hidden">Tam an</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-neutral-500">Kho hang</span>
              <select
                value={stockFilter}
                onChange={(event) => handleSelectStock(event.target.value)}
                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">Tat ca</option>
                <option value="in-stock">Con hang</option>
                <option value="low-stock">Sap het</option>
                <option value="out-of-stock">Het hang</option>
              </select>
            </label>
            <button
              type="button"
              onClick={refreshProducts}
              disabled={isLoading}
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Bo loc
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
          {isLoadingInitial ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
            </div>
          ) : filteredProducts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="w-12 px-5 py-4">
                      <input type="checkbox" className="h-4 w-4 rounded border-neutral-300 accent-emerald-600" />
                    </th>
                    <th className="px-5 py-4">San pham</th>
                    <th className="px-5 py-4">Danh muc</th>
                    <th className="px-5 py-4">Gia</th>
                    <th className="px-5 py-4">Kho hang</th>
                    <th className="px-5 py-4">Trang thai</th>
                    <th className="px-5 py-4 text-right">Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {filteredProducts.map((product) => {
                    const imageUrl = getProductImage(product);
                    const productId = getProductId(product);
                    const stock = getProductStock(product);
                    const categoryId = getProductCategoryId(product);

                    return (
                      <tr key={productId} className="transition-colors hover:bg-emerald-50/35">
                        <td className="px-5 py-4">
                          <input type="checkbox" className="h-4 w-4 rounded border-neutral-300 accent-emerald-600" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                              {imageUrl ? (
                                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-semibold text-neutral-400">No img</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/admin/products/${productId}`}
                                className="line-clamp-1 font-black text-neutral-950 hover:text-emerald-700"
                              >
                                {product.name}
                              </Link>
                              <p className="mt-1 text-sm font-semibold text-neutral-500">
                                SKU: {getFirstSku(product)}
                              </p>
                              <p className="mt-1 text-xs text-neutral-400">
                                {getProductImageCount(product)} anh
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-neutral-600">
                          {product.category?.name ||
                            product.categoryName ||
                            categoryNameById.get(String(categoryId)) ||
                            "-"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-black text-neutral-950">
                            {formatCurrency(product.salePrice || product.price)}
                          </div>
                          {product.salePrice && (
                            <div className="mt-1 text-xs font-semibold text-neutral-400 line-through">
                              {formatCurrency(product.price)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-neutral-950">{stock}</p>
                          <p className={`mt-1 text-xs font-bold ${getStockClass(stock)}`}>
                            {getStockLabel(stock)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-lg border px-3 py-1 text-xs font-bold ${
                              product.active === false
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {product.active === false ? "An" : "Hien thi"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/admin/products/${productId}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label="Chi tiet"
                            >
                              <Eye size={17} strokeWidth={2.1} aria-hidden="true" />
                            </Link>
                            <Link
                              to={`/admin/products/${productId}/edit`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label="Chinh sua"
                            >
                              <Pencil size={16} strokeWidth={2.1} aria-hidden="true" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Xoa"
                            >
                              <MoreVertical size={17} strokeWidth={2.1} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h3 className="text-sm font-semibold text-neutral-950">Khong co san pham phu hop</h3>
              <p className="mt-2 text-sm text-neutral-500">Thu doi bo loc hoac tao san pham moi.</p>
            </div>
          )}
          {!isLoadingInitial && (
            <div
              ref={loadMoreRef}
              className="flex flex-col items-center justify-center gap-3 border-t border-neutral-100 bg-white px-5 py-5"
            >
              {isLoadingMore ? (
                <>
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
                  <p className="text-xs font-semibold text-neutral-500">Dang tai them san pham...</p>
                </>
              ) : hasNext && nextCursor ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tai them san pham
                </button>
              ) : products.length ? (
                <p className="text-xs font-semibold text-neutral-400">Da tai het danh sach san pham.</p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl font-black text-red-600">
                !
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-950">Xoa san pham?</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Ban co chac muon xoa san pham{" "}
                  <span className="font-semibold text-neutral-950">{productToDelete.name}</span>
                  ? Thao tac nay khong the hoan tac.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-10 rounded-md bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? "Dang xoa..." : "Xoa san pham"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
