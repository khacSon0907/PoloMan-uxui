import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import BannerFallback from "../assets/Banner.png";
import { bannerApi } from "../features/banner";
import { categoryApi } from "../features/category";
import {
  formatCurrency,
  getProductId,
  getProductImage,
  getProductSlug,
  productApi,
} from "../features/product";
import { usePageMeta } from "../shared/hooks/usePageMeta";

const fallbackCategories = [];

const categoryImages = [
  "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622434641406-a158123450f9?q=80&w=300&auto=format&fit=crop",
];

const fallbackHeroBanner = {
  title: "BST MUA HE 2026",
  subtitle:
    "Kham pha cac thiet ke toi gian, tinh te hang dau. Chat lieu cao cap chuan phom ton dang thoi thuong cho quy ong hien dai.",
  imageUrl:
    "https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop",
  linkUrl: "/products",
};

function getCategoryFallbackImage(index) {
  return categoryImages[index % categoryImages.length];
}

function Home() {
  const [categories, setCategories] = useState(fallbackCategories);
  const [heroBanner, setHeroBanner] = useState(fallbackHeroBanner);
  const [products, setProducts] = useState([]);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [categoryIndex, setCategoryIndex] = useState(0);

  usePageMeta({
    title: "PoloMan Store | Thoi trang nam cao cap",
    description:
      "PoloMan Store cung cap ao polo, ao so mi, quan nam va phu kien thoi trang nam cao cap.",
    canonicalPath: "/",
  });

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      categoryApi.list(),
      bannerApi.listActive(),
      productApi.getAll(),
    ]).then(([categoryResult, bannerResult, productResult]) => {
      if (!isMounted) return;

      if (
        categoryResult.status === "fulfilled" &&
        Array.isArray(categoryResult.value) &&
        categoryResult.value.length
      ) {
        setCategories(
          categoryResult.value.filter((category) => category.active !== false),
        );
      }

      if (
        bannerResult.status === "fulfilled" &&
        Array.isArray(bannerResult.value)
      ) {
        const activeBanner = [...bannerResult.value]
          .filter((banner) => banner?.active !== false && banner?.imageUrl)
          .sort(
            (first, second) =>
              Number(first.sortOrder || 0) - Number(second.sortOrder || 0),
          )[0];

        if (activeBanner) {
          setHeroBanner({
            title: activeBanner.title || fallbackHeroBanner.title,
            subtitle: activeBanner.subtitle || fallbackHeroBanner.subtitle,
            imageUrl: activeBanner.imageUrl,
            linkUrl: activeBanner.linkUrl || fallbackHeroBanner.linkUrl,
          });
          setBannerImageUrl(activeBanner.imageUrl);
        }
      }

      if (
        productResult.status === "fulfilled" &&
        Array.isArray(productResult.value)
      ) {
        setProducts(
          productResult.value.filter((product) => product.active !== false),
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleCategories = useMemo(() => {
    const itemsPerPage = 3;
    const start = categoryIndex % Math.max(1, categories.length);
    if (categories.length <= itemsPerPage) return categories;
    return [
      categories[start],
      categories[(start + 1) % categories.length],
      categories[(start + 2) % categories.length],
    ];
  }, [categories, categoryIndex]);

  const handlePrevCategory = () => {
    setCategoryIndex(
      (prev) => (prev - 1 + categories.length) % Math.max(1, categories.length),
    );
  };

  const handleNextCategory = () => {
    setCategoryIndex((prev) => (prev + 1) % Math.max(1, categories.length));
  };

  const featuredProducts = products.slice(0, 4);

  return (
    <div className="space-y-12 pb-8 sm:space-y-16 sm:pb-10 lg:space-y-20 lg:pb-12">
      <section className="relative -mx-4 overflow-hidden bg-white sm:-mx-6 lg:-mx-10">
        {bannerImageUrl && (
          <img
            src={bannerImageUrl}
            alt=""
            onError={() => setBannerImageUrl(BannerFallback)}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.70)_0%,rgba(255,255,255,0.36)_36%,rgba(255,255,255,0.05)_68%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/35 to-transparent" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1500px] items-center px-4 py-14 sm:px-6 lg:min-h-[680px] lg:px-10">
          <div className="max-w-xl space-y-5 text-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.55)] md:text-left lg:space-y-6">
            <span className="inline-flex rounded-full border border-emerald-800/45 bg-white/55 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-950 shadow-sm backdrop-blur-[2px]">
              {heroBanner.title}
            </span>
            <h1 className="font-sans text-4xl font-extrabold uppercase leading-tight tracking-tight text-emerald-950 sm:text-5xl lg:text-7xl">
              Nang tam <br />
              <span className="text-emerald-800">phong thai</span>
            </h1>
            <p className="mx-auto max-w-md text-sm font-medium leading-6 text-emerald-950/78 md:mx-0">
              {heroBanner.subtitle}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-1 sm:flex-row sm:items-center md:justify-start">
              <Link
                to={heroBanner.linkUrl || "/products"}
                className="w-full rounded-md bg-emerald-800 px-8 py-3 text-center text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-emerald-900 active:scale-[0.98] sm:w-auto"
              >
                Mua ngay
              </Link>
              <Link
                to="/collections"
                className="w-full rounded-md border border-emerald-800/45 bg-white/65 px-8 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-950 shadow-sm backdrop-blur-[2px] transition-all hover:bg-white active:scale-[0.98] sm:w-auto"
              >
                Xem BST moi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {[
          {
            icon: "SHIP",
            title: "Mien phi van chuyen",
            desc: "Don hang tu 499.000d toan quoc",
          },
          {
            icon: "30D",
            title: "Doi tra de dang",
            desc: "Ho tro doi tra trong vong 30 ngay",
          },
          {
            icon: "QC",
            title: "Chat lieu cao cap",
            desc: "Kiem dinh chat luong chat che",
          },
          {
            icon: "24/7",
            title: "Ho tro tan tam",
            desc: "Cham soc khach hang moi ngay",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 transition-all hover:border-emerald-300 sm:p-5 lg:p-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-white text-xs font-black text-emerald-900">
              {item.icon}
            </span>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                {item.title}
              </h3>
              <p className="mt-0.5 text-[11px] text-emerald-900/60">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {visibleCategories.length > 0 && categories.length > 0 && (
        <section className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 border-b border-emerald-100 pb-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
                Category
              </p>
              <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-950 sm:text-3xl">
              Danh muc noi bat
              </h2>
              <p className="text-sm text-emerald-900/55">
                Chon nhanh 3 nhom san pham dang duoc quan tam.
              </p>
            </div>
            {categories.length > 3 && (
              <div className="flex justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handlePrevCategory}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-lg font-bold text-emerald-900 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50 active:scale-95"
                  aria-label="Danh muc truoc"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={handleNextCategory}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-800 text-lg font-bold text-white shadow-sm transition-all hover:bg-emerald-900 active:scale-95"
                  aria-label="Danh muc tiep theo"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
              {visibleCategories.map((cat, idx) => {
                const categoryIdx = categories.findIndex(
                  (c) => (c.id || c.slug) === (cat.id || cat.slug),
                );
                const fallbackImageUrl = getCategoryFallbackImage(
                  categoryIdx >= 0 ? categoryIdx : idx,
                );
                const imageUrl = cat.bannerUrl || fallbackImageUrl;

                return (
                  <Link
                    key={cat.id || cat.slug || cat.name}
                    to={`/products?category=${cat.slug || cat.id || "all"}`}
                    className="group relative min-h-72 overflow-hidden rounded-lg border border-emerald-100 bg-emerald-950 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_22px_55px_rgba(20,83,45,0.18)]"
                  >
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = fallbackImageUrl;
                      }}
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,44,34,0.02)_0%,rgba(2,44,34,0.24)_46%,rgba(2,44,34,0.90)_100%)]" />
                    <div className="absolute left-4 top-4 z-10">
                      <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                        Bo suu tap
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-5 text-white sm:p-6">
                      <div className="space-y-2">
                        <h3 className="line-clamp-2 text-xl font-black uppercase tracking-tight sm:text-2xl">
                          {cat.name}
                        </h3>
                        <p className="line-clamp-2 text-sm leading-5 text-white/76">
                          {cat.description || "Kham pha bo suu tap"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                        Xem san pham
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-900 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        >
                          &rarr;
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-emerald-100 pb-4 sm:flex-row">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-950">
              San pham moi
            </h2>
            <p className="text-xs text-emerald-900/55">
              Du lieu san pham duoc lay truc tiep tu admin
            </p>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-800 hover:underline"
          >
            Tat ca san pham
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {featuredProducts.map((prod, index) => {
              const imageUrl = getProductImage(prod);

              return (
                <article
                  key={getProductId(prod) || index}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <Link
                    to={`/products/${getProductSlug(prod)}`}
                    className="relative block aspect-[4/5] overflow-hidden bg-emerald-50 sm:h-64 sm:aspect-auto"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={prod.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-400">
                        No image
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-grow flex-col justify-between space-y-4 p-5">
                    <div className="space-y-1">
                      <Link
                        to={`/products/${getProductSlug(prod)}`}
                        className="line-clamp-2 text-sm font-bold text-emerald-950 transition-colors hover:text-emerald-700"
                      >
                        {prod.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-900">
                          {formatCurrency(prod.salePrice || prod.price)}
                        </span>
                        {prod.salePrice && (
                          <span className="text-[10px] text-neutral-400 line-through">
                            {formatCurrency(prod.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_44px] gap-2">
                      <Link
                        to={`/products/${getProductSlug(prod)}`}
                        className="flex items-center justify-center rounded-md bg-emerald-800 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-emerald-900"
                      >
                        Mua ngay
                      </Link>
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-md border border-emerald-200 text-emerald-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
                        aria-label="Yeu thich"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
            <h3 className="text-sm font-bold text-neutral-900">
              Chua co san pham hien thi
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Hay tao san pham active trong trang admin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
