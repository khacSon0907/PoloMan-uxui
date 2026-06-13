import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  formatCurrency,
  getProductId,
  getProductImage,
  getProductStock,
  productApi,
} from "../../features/product";
import { getApiMessage } from "../../shared/api";

function getProductImageCount(product) {
  const colors = product?.colors || product?.colorVariants || [];

  return colors.reduce((sum, color) => {
    const images = color?.images || [];
    return sum + images.length;
  }, product?.images?.length || 0);
}

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + getProductStock(product), 0),
    [products],
  );

  const activeCount = useMemo(
    () => products.filter((product) => product.active !== false).length,
    [products],
  );

  const loadProducts = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const productList = await productApi.list();
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Khong the tai danh sach san pham."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    productApi
      .list()
      .then((productList) => {
        if (isMounted) {
          setProducts(Array.isArray(productList) ? productList : []);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai danh sach san pham."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmDelete = async () => {
    const productId = getProductId(productToDelete);

    if (!productId) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await productApi.delete(productId);
      setProducts((current) =>
        current.filter((product) => String(getProductId(product)) !== String(productId)),
      );
      setProductToDelete(null);
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the xoa san pham."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Product manager
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Danh sach san pham
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Quan ly san pham, hinh anh, ton kho va trang thai hien thi tren
              website.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Tong</p>
              <p className="mt-2 text-3xl font-black">{products.length}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Dang hien</p>
              <p className="mt-2 text-3xl font-black">{activeCount}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/60">Ton kho</p>
              <p className="mt-2 text-3xl font-black">{totalStock}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-h-5 text-sm">
            {errorMessage && (
              <p className="font-medium text-red-600">{errorMessage}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadProducts}
              disabled={isLoading}
              className="h-10 rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 hover:border-emerald-600 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Tai lai
            </button>
            <Link
              to="/admin/products/create"
              className="flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-700"
            >
              Tao san pham
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
          </div>
        ) : products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3">San pham</th>
                  <th className="px-5 py-3">Danh muc</th>
                  <th className="px-5 py-3">Gia</th>
                  <th className="px-5 py-3">Anh</th>
                  <th className="px-5 py-3">Ton kho</th>
                  <th className="px-5 py-3">Trang thai</th>
                  <th className="w-40 px-5 py-3 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => {
                  const imageUrl = getProductImage(product);
                  const productId = getProductId(product);

                  return (
                    <tr
                      key={productId}
                      className="bg-white transition-colors hover:bg-emerald-50/45"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-neutral-400">
                                No img
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${productId}`}
                              className="line-clamp-2 font-semibold text-neutral-950 hover:text-emerald-700"
                            >
                              {product.name}
                            </Link>
                            <div className="mt-1 text-sm text-neutral-500">
                              {product.slug
                                ? `/${product.slug}`
                                : "Chua co slug"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 text-sm font-semibold text-neutral-500">
                        <span className="line-clamp-2 break-all">
                          {product.category?.name ||
                            product.categoryName ||
                            product.categoryId ||
                            "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-neutral-950">
                          {formatCurrency(product.salePrice || product.price)}
                        </div>
                        {product.salePrice && (
                          <div className="mt-1 text-xs text-neutral-400 line-through">
                            {formatCurrency(product.price)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-500">
                        {getProductImageCount(product)} anh
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-neutral-950">
                        {getProductStock(product)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                            product.active === false
                              ? "border-neutral-200 text-neutral-500"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {product.active === false ? "An" : "Dang hien"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Link
                            to={`/admin/products/${productId}`}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-bold text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50"
                          >
                            Chi tiet
                          </Link>
                          <Link
                            to={`/admin/products/${productId}/edit`}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Update
                          </Link>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-red-600 px-2.5 text-xs font-bold text-white hover:bg-red-700"
                          >
                            Delete
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
            <h3 className="text-sm font-semibold text-neutral-950">
              Chua co san pham
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Tao san pham dau tien de hien thi ngoai website.
            </p>
            <Link
              to="/admin/products/create"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-700"
            >
              Tao san pham
            </Link>
          </div>
        )}
      </section>

      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl font-black text-red-600">
                !
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-950">
                  Xoa san pham?
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Ban co chac muon xoa san pham{" "}
                  <span className="font-semibold text-neutral-950">
                    {productToDelete.name}
                  </span>
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
