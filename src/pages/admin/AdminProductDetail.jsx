import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { productApi } from "../../features/product";
import { getApiMessage } from "../../shared/api";

function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number.isFinite(number) ? number : 0);
}

function getProductId(product) {
  return product?.id || product?._id || product?.slug || product?.name;
}

function getColors(product) {
  return product?.colors || product?.colorVariants || [];
}

function getImages(color, product) {
  return color?.images || product?.images || [];
}

function getImageUrl(image) {
  return image?.url || image?.secureUrl || image?.imageUrl || "";
}

function getSizes(color) {
  return color?.sizes || color?.sizeVariants || [];
}

function getStock(product) {
  return getColors(product).reduce((sum, color) => {
    return (
      sum +
      getSizes(color).reduce(
        (sizeSum, size) => sizeSum + Number(size?.quantity || 0),
        0,
      )
    );
  }, 0);
}

function getImageCount(product) {
  return getColors(product).reduce(
    (sum, color) => sum + getImages(color, product).length,
    0,
  );
}

function getMainImage(product) {
  const firstColor = getColors(product)[0];
  const images = getImages(firstColor, product);
  return images.find((image) => image?.main) || images[0] || null;
}

function AdminProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const colors = useMemo(() => getColors(product), [product]);
  const mainImageUrl = getImageUrl(getMainImage(product));

  useEffect(() => {
    let isMounted = true;

    productApi
      .getById(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
        }
      })
      .catch(async (error) => {
        try {
          const list = await productApi.list();
          const foundProduct = Array.isArray(list)
            ? list.find(
                (item) =>
                  String(getProductId(item)) === String(id) ||
                  item?.slug === id,
              )
            : null;

          if (isMounted && foundProduct) {
            setProduct(foundProduct);
            return;
          }
        } catch {
          // Keep the original detail error below.
        }

        if (isMounted) {
          setErrorMessage(
            getApiMessage(error, "Khong the tai chi tiet san pham."),
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
  }, [id]);

  const handleDeleteProduct = async () => {
    const productId = getProductId(product);

    if (!productId) return;
    if (!window.confirm("Ban co chac muon xoa san pham nay?")) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await productApi.delete(productId);
      navigate("/admin/products", { replace: true });
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the xoa san pham."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-neutral-200 bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-600" />
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-neutral-950">
          Khong tim thay san pham
        </h2>
        <p className="mt-2 text-sm text-red-600">
          {errorMessage || "San pham khong ton tai."}
        </p>
        <Link
          to="/admin/products"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-700"
        >
          Ve danh sach
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid gap-5 bg-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Product detail
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              {product.name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              {product.slug ? `/${product.slug}` : "Chua co slug"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/admin/products"
              className="flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-white/10"
            >
              Ve danh sach
            </Link>
            <Link
              to={`/admin/products/${getProductId(product)}/edit`}
              className="flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-bold uppercase tracking-[0.12em] text-neutral-950 hover:bg-neutral-200"
            >
              Update
            </Link>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm font-semibold text-neutral-400">
                  No image
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Mau
                </p>
                <p className="mt-2 text-2xl font-black text-neutral-950">
                  {colors.length}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Anh
                </p>
                <p className="mt-2 text-2xl font-black text-neutral-950">
                  {getImageCount(product)}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Ton
                </p>
                <p className="mt-2 text-2xl font-black text-neutral-950">
                  {getStock(product)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-base font-semibold text-neutral-950">
                Thong tin
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Gia
                  </p>
                  <p className="mt-1 text-xl font-black text-neutral-950">
                    {formatCurrency(product.salePrice || product.price)}
                  </p>
                  {product.salePrice && (
                    <p className="mt-1 text-sm text-neutral-400 line-through">
                      {formatCurrency(product.price)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Trang thai
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                      product.active === false
                        ? "border-neutral-200 text-neutral-500"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {product.active === false ? "An" : "Dang hien"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Danh muc
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-950">
                    {product.category?.name ||
                      product.categoryName ||
                      product.categoryId ||
                      "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                    ID
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-neutral-950">
                    {getProductId(product)}
                  </p>
                </div>
              </div>
              {product.description && (
                <p className="mt-4 rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
                  {product.description}
                </p>
              )}
            </section>

            <section className="space-y-4">
              {colors.map((color, colorIndex) => {
                const images = getImages(color, product);
                const mainImage =
                  images.find((image) => image?.main) || images[0];
                const subImages = images.filter((image) => image !== mainImage);

                return (
                  <div
                    key={`${color.colorName}-${colorIndex}`}
                    className="rounded-lg border border-neutral-200 p-4"
                  >
                    <div className="flex flex-col gap-3 border-b border-neutral-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-950">
                          {color.colorName || `Mau ${colorIndex + 1}`}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {getSizes(color).length} size
                        </p>
                      </div>
                      {color.colorCode && (
                        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
                          <span
                            className="h-6 w-6 rounded border border-neutral-200"
                            style={{ backgroundColor: color.colorCode }}
                          />
                          {color.colorCode}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                          Anh chinh
                        </p>
                        <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                          {getImageUrl(mainImage) ? (
                            <img
                              src={getImageUrl(mainImage)}
                              alt=""
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-square items-center justify-center text-sm font-semibold text-neutral-400">
                              No image
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                          Anh phu
                        </p>
                        {subImages.length ? (
                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                            {subImages.map((image, imageIndex) => (
                              <div
                                key={`${getImageUrl(image)}-${imageIndex}`}
                                className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
                              >
                                <img
                                  src={getImageUrl(image)}
                                  alt=""
                                  className="aspect-square w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-neutral-200 text-sm font-semibold text-neutral-400">
                            Chua co anh phu
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[520px] w-full text-left">
                        <thead className="bg-neutral-50 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                          <tr>
                            <th className="px-3 py-2">Size</th>
                            <th className="px-3 py-2">SKU</th>
                            <th className="px-3 py-2">So luong</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {getSizes(color).map((size, sizeIndex) => (
                            <tr key={`${size.size}-${sizeIndex}`}>
                              <td className="px-3 py-2 text-sm font-semibold text-neutral-950">
                                {size.size}
                              </td>
                              <td className="px-3 py-2 text-sm text-neutral-500">
                                {size.sku || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm font-semibold text-neutral-950">
                                {Number(size.quantity || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminProductDetail;
