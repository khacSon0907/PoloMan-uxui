import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Headphones,
  Heart,
  ImagePlus,
  Loader2,
  RotateCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Star,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  cartApi,
  cartStorage,
  favoriteApi,
  formatCurrency,
  getImageUrl,
  getProductColorCode,
  getProductColorId,
  getProductColorName,
  getProductColors,
  getProductId,
  getProductImage,
  getProductImages,
  getProductName,
  getProductPrice,
  getProductSizeId,
  getProductSizeName,
  getProductSizes,
  getProductSlug,
  getProductStock,
  getUserId,
  productApi,
} from "../features/product";
import { emptyReviewSummary, reviewApi } from "../features/review";
import { getApiMessage, tokenStorage } from "../shared/api";
import { usePageMeta } from "../shared/hooks/usePageMeta";
import { uploadImageToCloudinary } from "../shared/services/cloudinaryUpload";
import { playAddToCartEffect } from "../shared/utils/cartMotion";

function clampQuantity(value, maxQuantity) {
  const normalizedMax = Math.max(1, Number(maxQuantity || 1));
  const nextValue = Math.floor(Number(value || 1));

  if (!Number.isFinite(nextValue) || nextValue < 1) return 1;

  return Math.min(nextValue, normalizedMax);
}

const BUY_NOW_STORAGE_KEY = "poloman:buy-now-checkout";
const REVIEW_IMAGE_LIMIT = 4;

function getReviewId(review) {
  return review?.id || review?._id || review?.reviewId || "";
}

function getReviewUserId(review) {
  return (
    review?.userId ||
    review?.user?.id ||
    review?.user?._id ||
    review?.user?.userId ||
    ""
  );
}

function getReviewUserName(review) {
  return (
    review?.userName ||
    review?.username ||
    review?.user?.username ||
    review?.user?.fullName ||
    review?.user?.name ||
    getReviewUserId(review) ||
    "Khach hang"
  );
}

function getReviewUserAvatar(review) {
  return review?.userAvatarUrl || review?.user?.avatarUrl || review?.user?.avatar || "";
}

function getAvatarInitial(value) {
  return String(value || "K").trim().charAt(0).toUpperCase() || "K";
}

function getReviewImages(review) {
  if (Array.isArray(review?.images)) return review.images.filter(Boolean);
  if (Array.isArray(review?.imageUrls)) return review.imageUrls.filter(Boolean);
  if (review?.image) return [review.image];

  return [];
}

function formatReviewDate(value) {
  if (!value) return "Vua xong";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vua xong";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getCreatedAt(review) {
  return (
    review?.createdAt ||
    review?.createdDate ||
    review?.created_at ||
    review?.updatedAt ||
    review?.updatedDate
  );
}

function clampRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 0;

  return Math.min(5, Math.max(0, Math.round(rating)));
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot());
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(emptyReviewSummary);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewErrorMessage, setReviewErrorMessage] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("description");
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const mainImageRef = useRef(null);
  const addToCartButtonRef = useRef(null);
  const reviewsPanelRef = useRef(null);
  const reviewImageInputRef = useRef(null);
  const reviewImagesRef = useRef([]);
  const skipNextReviewAutofillRef = useRef(false);

  const colors = useMemo(() => getProductColors(product), [product]);
  const selectedColor = colors[selectedColorIndex] || colors[0];
  const images = useMemo(
    () => getProductImages(product, selectedColor),
    [product, selectedColor],
  );
  const imageUrls = useMemo(
    () => images.map(getImageUrl).filter(Boolean),
    [images],
  );
  const sizes = useMemo(
    () => getProductSizes(product, selectedColor),
    [product, selectedColor],
  );
  const selectedSizeData = sizes.find(
    (size) => getProductSizeName(size) === selectedSize,
  );
  const selectedStock = Number(selectedSizeData?.quantity || 0);
  const productStock = getProductStock(product);
  const quantityStockLimit = sizes.length
    ? selectedSize
      ? selectedStock
      : productStock
    : productStock;
  const maxQuantity = Math.max(1, Number(quantityStockLimit || 1));
  const mainImage =
    imageUrls[selectedImageIndex] || getProductImage(product, selectedColor);
  const productName = getProductName(product);
  const productCategoryId =
    product?.category?.id ||
    product?.category?._id ||
    product?.categoryId ||
    "";
  const descriptionParagraphs = useMemo(
    () =>
      String(product?.description || "")
        .replace(/\*\*/g, "")
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [product?.description],
  );
  const hasLongDescription =
    descriptionParagraphs.join(" ").length > 520 ||
    descriptionParagraphs.length > 2;
  const userId = getUserId(authSnapshot.user);
  const productId = product ? getProductId(product) : "";
  const userReview = useMemo(
    () =>
      reviews.find(
        (review) =>
          userId && String(getReviewUserId(review)) === String(userId),
      ),
    [reviews, userId],
  );
  const userReviewId = getReviewId(userReview);
  const averageRating = Number(reviewSummary.averageRating || 0);
  const totalReviews = Number(
    reviewSummary.totalReviews || reviews.length || 0,
  );

  usePageMeta({
    title: productName
      ? `${productName} | PoloMan`
      : "Chi tiet san pham | PoloMan",
    description: product?.description || "Chi tiet san pham PoloMan.",
    canonicalPath: `/products/${id}`,
  });

  useEffect(() => {
    const unsubscribe = tokenStorage.subscribe(setAuthSnapshot);

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoading(true);
      setPageErrorMessage("");
      setErrorMessage("");
      setSuccessMessage("");
    });

    productApi
      .getById(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          setPageErrorMessage("");
          setSelectedColorIndex(0);
          setSelectedImageIndex(0);
          setSelectedSize("");
          setQuantity(1);
        }
      })
      .catch(async (error) => {
        try {
          const list = await productApi.getAll();
          const foundProduct = Array.isArray(list)
            ? list.find(
                (item) =>
                  String(getProductId(item)) === String(id) ||
                  String(item?.slug) === String(id),
              )
            : null;

          if (isMounted && foundProduct) {
            setProduct(foundProduct);
            setSelectedColorIndex(0);
            setSelectedImageIndex(0);
            setSelectedSize("");
            setQuantity(1);
            return;
          }
        } catch {
          // Keep original detail error.
        }

        if (isMounted)
          setPageErrorMessage(
            getApiMessage(error, "Khong the tai chi tiet san pham."),
          );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product || !userId) {
      Promise.resolve().then(() => {
        setIsFavorite(false);
      });
      return undefined;
    }

    let isMounted = true;
    const productId = String(getProductId(product));

    favoriteApi
      .getFavorite(userId)
      .then((items) => {
        if (isMounted)
          setIsFavorite(
            items.some((item) => String(item.productId) === productId),
          );
      })
      .catch(() => {
        if (isMounted) setIsFavorite(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product, userId]);

  useEffect(() => {
    if (!productId) return undefined;

    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsReviewsLoading(true);
      setReviewErrorMessage("");
    });

    Promise.all([
      reviewApi.getReviewsByProductId(productId),
      reviewApi.getReviewSummaryByProductId(productId),
    ])
      .then(([nextReviews, nextSummary]) => {
        if (!isMounted) return;

        setReviews(nextReviews);
        setReviewSummary(nextSummary);
      })
      .catch((error) => {
        if (!isMounted) return;

        setReviews([]);
        setReviewSummary(emptyReviewSummary);
        setReviewErrorMessage(
          getApiMessage(error, "Khong the tai danh gia san pham."),
        );
      })
      .finally(() => {
        if (isMounted) setIsReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!userReview) return;

    Promise.resolve().then(() => {
      if (skipNextReviewAutofillRef.current) {
        skipNextReviewAutofillRef.current = false;
        return;
      }

      setReviewRating(clampRating(userReview.rating));
      setReviewTitle(userReview.title || userReview.reviewTitle || "");
      setReviewText(
        userReview.comment || userReview.content || userReview.text || "",
      );
      setReviewImages(
        getReviewImages(userReview)
          .slice(0, REVIEW_IMAGE_LIMIT)
          .map((imageUrl, index) => ({
            id: `saved-${index}-${imageUrl}`,
            url: imageUrl,
            name: `Anh danh gia ${index + 1}`,
            previewUrl: imageUrl,
            isObjectUrl: false,
          })),
      );
    });
  }, [userReview]);

  useEffect(() => {
    if (!product) return undefined;

    let isMounted = true;
    const currentProductId = String(getProductId(product));

    productApi
      .getAll()
      .then((list) => {
        if (!isMounted || !Array.isArray(list)) return;

        const activeProducts = list.filter(
          (item) =>
            item.active !== false &&
            String(getProductId(item)) !== currentProductId,
        );
        const sameCategory = activeProducts.filter((item) => {
          const categoryId =
            item?.category?.id || item?.category?._id || item?.categoryId || "";

          return (
            productCategoryId &&
            String(categoryId) === String(productCategoryId)
          );
        });
        const otherProducts = activeProducts.filter(
          (item) => !sameCategory.includes(item),
        );

        setRecommendedProducts([...sameCategory, ...otherProducts].slice(0, 4));
      })
      .catch(() => {
        if (isMounted) setRecommendedProducts([]);
      });

    return () => {
      isMounted = false;
    };
  }, [product, productCategoryId]);

  useEffect(() => {
    reviewImagesRef.current = reviewImages;
  }, [reviewImages]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setQuantity((current) => clampQuantity(current, maxQuantity));
    });
  }, [maxQuantity]);

  useEffect(
    () => () => {
      reviewImagesRef.current.forEach((image) => {
        if (image.isObjectUrl) URL.revokeObjectURL(image.previewUrl);
      });
    },
    [],
  );

  const buildValidatedCartItem = () => {
    if (!product) return null;

    if (sizes.length && !selectedSize) {
      setSuccessMessage("");
      setErrorMessage("Vui long chon kich thuoc.");
      return null;
    }

    if (quantityStockLimit <= 0) {
      setSuccessMessage("");
      setErrorMessage("San pham da het hang.");
      return null;
    }

    if (quantity > quantityStockLimit) {
      setSuccessMessage("");
      setErrorMessage(
        `So luong khong duoc vuot qua ton kho (${quantityStockLimit}).`,
      );
      setQuantity(clampQuantity(quantity, quantityStockLimit));
      return null;
    }

    return {
      productId: getProductId(product),
      slug: getProductSlug(product),
      name: productName,
      price: getProductPrice(product),
      image: mainImage,
      colorId: getProductColorId(selectedColor),
      colorName: getProductColorName(selectedColor),
      colorCode: getProductColorCode(selectedColor),
      sizeId: getProductSizeId(selectedSizeData),
      size: selectedSize || getProductSizeName(selectedSizeData),
      quantity,
    };
  };

  const handleAddToCart = async () => {
    const cartItem = buildValidatedCartItem();

    if (!cartItem) return false;

    const userId = getUserId(tokenStorage.getUser());

    try {
      if (userId) {
        await cartApi.addItem(userId, {
          productId: cartItem.productId,
          productName: cartItem.name,
          productImage: cartItem.image,
          colorId: cartItem.colorId,
          colorName: cartItem.colorName,
          sizeId: cartItem.sizeId,
          sizeName: cartItem.size,
          quantity: cartItem.quantity,
        });
      } else {
        cartStorage.addItem(cartItem);
      }

      setErrorMessage("");
      setSuccessMessage("Da them san pham vao gio hang.");
      playAddToCartEffect({
        sourceElement: addToCartButtonRef.current,
        imageElement: mainImageRef.current,
      });
      return true;
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(
        getApiMessage(error, "Khong the them san pham vao gio hang."),
      );
      return false;
    }
  };

  const handleBuyNow = () => {
    const cartItem = buildValidatedCartItem();

    if (!cartItem) return;

    sessionStorage.setItem(
      BUY_NOW_STORAGE_KEY,
      JSON.stringify({
        item: cartItem,
      }),
    );
    setErrorMessage("");
    navigate("/cart?mode=buy-now");
  };

  const handleToggleFavorite = async () => {
    if (!product) return;
    if (isFavoriteLoading) return;

    if (!userId) {
      navigate("/login", {
        state: {
          message: "Vui long dang nhap de them san pham vao yeu thich.",
        },
      });
      return;
    }

    const productId = getProductId(product);
    const nextFavorite = !isFavorite;

    setIsFavorite(nextFavorite);
    setIsFavoriteLoading(true);
    setSuccessMessage(
      nextFavorite
        ? "Da luu san pham vao yeu thich."
        : "Da xoa san pham khoi yeu thich.",
    );
    setErrorMessage("");

    try {
      if (nextFavorite) {
        await favoriteApi.addItem(userId, productId);
      } else {
        await favoriteApi.removeItem(userId, productId);
      }

      const latestFavorites = await favoriteApi.getFavorite(userId);
      setIsFavorite(
        latestFavorites.some(
          (item) => String(item.productId) === String(productId),
        ),
      );
    } catch (error) {
      setIsFavorite(!nextFavorite);
      setSuccessMessage("");
      setErrorMessage(
        getApiMessage(error, "Khong the cap nhat san pham yeu thich."),
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const showImageControls = imageUrls.length > 1;

  const goToPreviousImage = () => {
    if (!showImageControls) return;

    setSelectedImageIndex(
      (current) => (current - 1 + imageUrls.length) % imageUrls.length,
    );
  };

  const goToNextImage = () => {
    if (!showImageControls) return;

    setSelectedImageIndex((current) => (current + 1) % imageUrls.length);
  };

  const reloadReviews = async () => {
    if (!productId) return;

    const [nextReviews, nextSummary] = await Promise.all([
      reviewApi.getReviewsByProductId(productId),
      reviewApi.getReviewSummaryByProductId(productId),
    ]);

    setReviews(nextReviews);
    setReviewSummary(nextSummary);
    setReviewErrorMessage("");
  };

  const handleReviewImagesChange = (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, REVIEW_IMAGE_LIMIT - reviewImages.length));

    event.target.value = "";

    if (!files.length) return;

    setReviewImages((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        isObjectUrl: true,
      })),
    ]);
  };

  const removeReviewImage = (imageId) => {
    setReviewImages((current) =>
      current.filter((image) => {
        if (image.id === imageId) {
          if (image.isObjectUrl) URL.revokeObjectURL(image.previewUrl);
          return false;
        }

        return true;
      }),
    );
  };

  const resetReviewForm = () => {
    reviewImagesRef.current.forEach((image) => {
      if (image.isObjectUrl) URL.revokeObjectURL(image.previewUrl);
    });
    setReviewImages([]);
    setReviewTitle("");
    setReviewText("");
    setReviewRating(5);
  };

  const scrollToReviewsPanel = () => {
    requestAnimationFrame(() => {
      reviewsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const uploadReviewImages = async () => {
    const uploadedUrls = await Promise.all(
      reviewImages.map(async (image) => {
        if (!image.file) return image.url || "";

        const uploadResult = await uploadImageToCloudinary(
          image.file,
          "REVIEW",
        );
        const imageUrl = uploadResult.secure_url || uploadResult.url;

        if (!imageUrl)
          throw new Error("Cloudinary khong tra ve link anh danh gia.");

        return imageUrl;
      }),
    );

    return uploadedUrls.filter(Boolean);
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!productId) return;

    if (!userId) {
      navigate("/login", {
        state: {
          message: "Vui long dang nhap de danh gia san pham.",
        },
      });
      return;
    }

    setIsReviewSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const imageUrls = await uploadReviewImages();
      const payload = {
        productId,
        userId,
        rating: clampRating(reviewRating),
        title: reviewTitle.trim(),
        comment: reviewText.trim(),
        images: imageUrls,
      };

      if (userReviewId) {
        await reviewApi.updateReview(userReviewId, payload);
      } else {
        await reviewApi.createReview(payload);
      }

      skipNextReviewAutofillRef.current = true;
      await reloadReviews();
      resetReviewForm();
      setSuccessMessage(
        userReviewId
          ? "Da cap nhat danh gia cua ban."
          : "Da gui danh gia cua ban.",
      );
      setActiveDetailTab("reviews");
      scrollToReviewsPanel();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the gui danh gia."));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId || deletingReviewId) return;

    setDeletingReviewId(reviewId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await reviewApi.deleteReview(reviewId);
      await reloadReviews();

      if (reviewId === userReviewId) resetReviewForm();

      setSuccessMessage("Da xoa danh gia.");
      setActiveDetailTab("reviews");
      scrollToReviewsPanel();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Khong the xoa danh gia."));
    } finally {
      setDeletingReviewId("");
    }
  };

  const reviewSamples = reviews.map((review) => ({
    name: getReviewUserName(review),
    rating: clampRating(review.rating),
    fit: formatReviewDate(getCreatedAt(review)),
    text: review.comment || review.content || review.text || "",
  }));

  const renderReviewForm = () => (
    <form
      onSubmit={handleReviewSubmit}
      className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_18px_60px_rgba(2,44,34,0.06)] sm:p-6"
    >
      <div>
        <h2 className="text-xl font-black text-neutral-950 sm:text-2xl">
          Chia se trai nghiem cua ban
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Danh gia cua ban se giup khach hang khac lua chon san pham phu hop.
        </p>
      </div>

      <div className="mt-7">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[240px_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black text-neutral-950">
              Cham sao <span className="text-red-500">*</span>
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-500">
              Hay danh gia muc do hai long cua ban
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setReviewRating(rating)}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-black transition-colors ${
                  reviewRating === rating
                    ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-900 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
                aria-label={`Chon ${rating} sao`}
              >
                {rating}
                <Star className="h-4 w-4 fill-current" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        <label className="mt-7 grid gap-2">
       
          <span className="relative">
           
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500">
              {reviewTitle.length}/100
            </span>
          </span>
        </label>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-black text-neutral-950">
            Viet danh gia cua ban <span className="text-red-500">*</span>
          </span>
          <span className="relative">
            <textarea
              value={reviewText}
              onChange={(event) =>
                setReviewText(event.target.value.slice(0, 1000))
              }
              rows={5}
              maxLength={1000}
              placeholder="Chia se chi tiet trai nghiem, uu diem, nhuoc diem cua san pham..."
              className="min-h-32 w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-3 pb-8 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />
            <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-semibold text-neutral-500">
              {reviewText.length}/1000
            </span>
          </span>
        </label>

        <div className="mt-5">
          <div>
            <p className="text-sm font-black text-neutral-950">
              Hinh anh san pham{" "}
              <span className="font-medium text-neutral-500">(tuy chon)</span>
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-500">
              Them hinh anh thuc te de danh gia cua ban huu ich hon.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => reviewImageInputRef.current?.click()}
              disabled={reviewImages.length >= REVIEW_IMAGE_LIMIT}
              className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-3 text-center text-neutral-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Them anh danh gia"
            >
              <ImagePlus className="h-6 w-6" strokeWidth={1.7} />
              <span className="mt-2 text-sm font-black">Them anh</span>
              <span className="mt-1 text-xs text-neutral-500">
                {reviewImages.length}/{REVIEW_IMAGE_LIMIT} anh
              </span>
            </button>
            {reviewImages.map((image) => (
              <div
                key={image.id}
                className="group relative min-h-24 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50"
              >
                <img
                  src={image.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeReviewImage(image.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950/75 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Xoa anh"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
            {Array.from({
              length: Math.max(0, REVIEW_IMAGE_LIMIT - reviewImages.length - 1),
            }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="hidden min-h-24 items-center justify-center rounded-lg bg-neutral-50 text-neutral-300 sm:flex"
              >
                <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <input
            ref={reviewImageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleReviewImagesChange}
            className="sr-only"
          />
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked
            readOnly
            className="mt-0.5 h-5 w-5 rounded border-neutral-300 accent-emerald-800"
          />
          <span>Xac nhan: Toi da mua san pham nay tai POLOMAN</span>
        </label>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetReviewForm}
          className="h-11 rounded-lg border border-neutral-200 px-8 text-sm font-black text-neutral-900 transition hover:bg-neutral-50"
        >
          Huy
        </button>
        <button
          type="submit"
          disabled={isReviewSubmitting}
          className="flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-8 text-sm font-black text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-70"
        >
          {isReviewSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
          )}
          {userReviewId ? "Cap nhat danh gia" : "Gui danh gia"}
        </button>
      </div>
      {!userId && (
        <p className="mt-3 text-xs leading-5 text-neutral-500">
          Ban can dang nhap de gui danh gia.
        </p>
      )}
    </form>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-neutral-200 bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
      </div>
    );
  }

  if (pageErrorMessage || !product) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <h1 className="text-xl font-black text-neutral-950">
          Khong tim thay san pham
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {pageErrorMessage || "San pham khong ton tai."}
        </p>
        <Link
          to="/products"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
        >
          Ve san pham
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6 bg-white px-1 py-2 sm:px-0">
      <nav className="text-sm text-emerald-900/55">
        <Link to="/" className="hover:text-emerald-900">
          Trang chu
        </Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-emerald-900">
          San pham
        </Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-950">{productName}</span>
      </nav>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:grid-cols-[minmax(0,1.16fr)_minmax(460px,0.84fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[86px_1fr]">
            <div className="scrollbar-hidden flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible">
              {(imageUrls.length ? imageUrls : [mainImage])
                .filter(Boolean)
                .map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${
                      selectedImageIndex === index
                        ? "border-emerald-800 ring-2 ring-emerald-100"
                        : "border-neutral-200 hover:border-emerald-300"
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-contain p-1.5"
                    />
                  </button>
                ))}
            </div>

            <div className="relative flex h-[430px] items-center justify-center overflow-hidden rounded-2xl bg-neutral-50 shadow-sm ring-1 ring-neutral-100 sm:h-[590px] lg:h-[620px]">
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={isFavoriteLoading}
                className={`absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border bg-white/92 shadow-sm backdrop-blur transition-colors ${
                  isFavorite
                    ? "border-red-100 text-red-600"
                    : "border-neutral-100 text-emerald-950 hover:text-emerald-700"
                } disabled:cursor-wait disabled:opacity-70`}
                aria-label="Them vao yeu thich"
              >
                <Heart
                  className="h-5 w-5"
                  fill={isFavorite ? "currentColor" : "none"}
                  strokeWidth={1.8}
                />
              </button>
              {mainImage ? (
                <img
                  ref={mainImageRef}
                  src={mainImage}
                  alt={productName}
                  className="h-full w-full object-contain p-6 sm:p-8"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-neutral-400">
                  No image
                </div>
              )}

              {showImageControls && (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-2xl font-light text-transparent shadow-[0_12px_30px_rgba(2,44,34,0.16)] backdrop-blur transition-all before:absolute before:text-xl before:text-emerald-950 before:content-['‹'] hover:scale-105 hover:bg-white"
                    aria-label="Anh truoc"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-2xl font-light text-transparent shadow-[0_12px_30px_rgba(2,44,34,0.16)] backdrop-blur transition-all before:absolute before:text-xl before:text-emerald-950 before:content-['›'] hover:scale-105 hover:bg-white"
                    aria-label="Anh tiep theo"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-emerald-950/45 px-2.5 py-2 backdrop-blur">
                    {imageUrls.map((imageUrl, index) => (
                      <button
                        key={`${imageUrl}-dot`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          selectedImageIndex === index
                            ? "w-6 bg-white"
                            : "w-2 bg-white/55 hover:bg-white/80"
                        }`}
                        aria-label={`Chon anh ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <section className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_18px_60px_rgba(2,44,34,0.06)] sm:p-5">
            <div className="flex gap-4 overflow-x-auto border-b border-neutral-100">
              {[
                ["description", "Mo ta san pham"],
                ["material", "Chat lieu"],
                ["care", "Huong dan bao quan"],
                ["reviews", `Danh gia (${totalReviews})`],
              ].map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveDetailTab(tabId)}
                  className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-black uppercase tracking-[0.08em] transition-colors ${
                    activeDetailTab === tabId
                      ? "border-emerald-800 text-emerald-900"
                      : "border-transparent text-neutral-500 hover:text-emerald-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeDetailTab === "description" && (
              <div className="pt-5">
                {descriptionParagraphs.length > 0 ? (
                  <>
                    <div
                      className={`space-y-3 overflow-hidden text-sm leading-7 text-neutral-700 transition-[max-height] duration-300 ${
                        hasLongDescription && !isDescriptionExpanded
                          ? "max-h-48"
                          : "max-h-[900px]"
                      }`}
                    >
                      {descriptionParagraphs.map((paragraph, index) => (
                        <p
                          key={`${paragraph.slice(0, 24)}-${index}`}
                          className={
                            index === 0 ? "font-semibold text-neutral-900" : ""
                          }
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {hasLongDescription && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsDescriptionExpanded((current) => !current)
                        }
                        className="mt-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-700 hover:text-emerald-950"
                      >
                        {isDescriptionExpanded ? "Thu gon" : "Xem them mo ta"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">
                    San pham chua co mo ta.
                  </p>
                )}
              </div>
            )}

            {activeDetailTab === "material" && (
              <div className="grid gap-2 pt-5 text-sm leading-7 text-neutral-700 sm:grid-cols-2">
                {[
                  "Chat lieu mem, ben va de mac hang ngay",
                  "Be mat vai thoang, han che bi nong bi",
                  "Duong may chac chan, giu form tot",
                  "Phu hop phoi do di hoc, di choi hoac di lam",
                ].map((item) => (
                  <p key={item} className="flex items-start gap-2">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-emerald-700"
                      strokeWidth={1.9}
                    />
                    {item}
                  </p>
                ))}
              </div>
            )}

            {activeDetailTab === "care" && (
              <div className="grid gap-2 pt-5 text-sm leading-7 text-neutral-700 sm:grid-cols-2">
                {[
                  "Giat rieng voi mau dam trong lan giat dau.",
                  "Nen giat mat trai va cai nut/keo khoa truoc khi giat.",
                  "Khong dung chat tay manh de giu mau va be mat vai.",
                  "Phoi noi thoang mat, han che nang gat truc tiep.",
                  "Ui mat trai voi nhiet do thap neu can.",
                  "Khong say nhiet cao de tranh co rut va mat form.",
                ].map((item) => (
                  <p key={item} className="flex items-start gap-2">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-emerald-700"
                      strokeWidth={1.9}
                    />
                    {item}
                  </p>
                ))}
              </div>
            )}

            {activeDetailTab === "reviews" && (
              <div className="pt-5">
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Phan danh gia chi tiet nam ngay ben duoi thong tin san pham de
                  ban thao tac rong hon.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_18px_60px_rgba(2,44,34,0.08)] sm:p-6 lg:p-7">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-emerald-700">
                Moi
              </span>
            </div>
            <h1 className="text-2xl font-black leading-tight text-neutral-950 sm:text-3xl lg:text-[32px]">
              {productName}
            </h1>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="text-2xl font-black text-emerald-800 sm:text-3xl">
                {formatCurrency(product.salePrice || product.price)}
              </span>
              {product.salePrice && (
                <span className="text-sm font-semibold text-neutral-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-950">
              Uu dai danh cho ban
            </p>
            <div className="mt-3 space-y-2.5 text-sm text-emerald-900/75">
              <p className="flex items-center gap-2">
                <Ticket
                  className="h-4 w-4 text-emerald-700"
                  strokeWidth={1.8}
                />
                Nhap ma{" "}
                <span className="font-black text-emerald-950">JUN20</span> giam
                20K don tu 499K
              </p>
              <p className="flex items-center gap-2">
                <Ticket
                  className="h-4 w-4 text-emerald-700"
                  strokeWidth={1.8}
                />
                Nhap ma{" "}
                <span className="font-black text-emerald-950">JUN50</span> giam
                50K don tu 799K
              </p>
              <p className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
                <span className="font-black text-emerald-950">
                  Freeship
                </span>{" "}
                don tu 399K
              </p>
            </div>
          </div>

          {colors.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-950">
                Mau sac:{" "}
                {getProductColorName(selectedColor) ||
                  `Mau ${selectedColorIndex + 1}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color, index) => {
                  const colorImage = getProductImage(product, color);

                  return (
                    <button
                      key={`${getProductColorName(color)}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedColorIndex(index);
                        setSelectedImageIndex(0);
                        setSelectedSize("");
                        setQuantity(1);
                      }}
                      className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-white p-1 ${
                        selectedColorIndex === index
                          ? "border-emerald-800 ring-2 ring-emerald-100"
                          : "border-emerald-100"
                      }`}
                      title={getProductColorName(color)}
                    >
                      {colorImage ? (
                        <img
                          src={colorImage}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="h-full w-full rounded-full border border-neutral-200"
                          style={{
                            backgroundColor:
                              getProductColorCode(color) || "#f5f5f5",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-emerald-950">
                Kich thuoc: {selectedSize || "Chon size"}
              </p>
              <Link
                to="/size-guide"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-950"
              >
                <Ruler className="h-4 w-4" strokeWidth={1.8} />
                Huong dan chon size
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.length ? (
                sizes.map((size) => {
                  const disabled = Number(size?.quantity || 0) <= 0;
                  const sizeName = getProductSizeName(size);

                  return (
                    <button
                      key={sizeName}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSize(sizeName)}
                      className={`h-12 min-w-12 rounded-md border px-4 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        selectedSize === sizeName
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-emerald-100 bg-white text-emerald-950 hover:border-emerald-500"
                      }`}
                    >
                      {sizeName}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500">
                  San pham chua co size.
                </p>
              )}
            </div>
            <p className="text-xs font-semibold text-emerald-900/55">
              Ton kho: {selectedSize ? selectedStock : getProductStock(product)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[168px_1fr]">
            <div className="flex h-12 items-center justify-between rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    clampQuantity(Number(current || 1) - 1, maxQuantity),
                  )
                }
                disabled={quantity <= 1}
                className="h-full px-5 text-xl font-black disabled:cursor-not-allowed disabled:opacity-35"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(event) =>
                  setQuantity(clampQuantity(event.target.value, maxQuantity))
                }
                onBlur={(event) =>
                  setQuantity(clampQuantity(event.target.value, maxQuantity))
                }
                className="h-full min-w-10 flex-1 border-x border-neutral-200 bg-transparent px-2 text-center text-sm font-black outline-none"
                aria-label="So luong san pham"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    clampQuantity(Number(current || 1) + 1, maxQuantity),
                  )
                }
                disabled={quantity >= maxQuantity || quantityStockLimit <= 0}
                className="h-full px-5 text-xl font-black disabled:cursor-not-allowed disabled:opacity-35"
              >
                +
              </button>
            </div>
            <button
              ref={addToCartButtonRef}
              type="button"
              onClick={handleAddToCart}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-sm transition-colors hover:bg-emerald-900"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
              Them vao gio
            </button>
          </div>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex h-12 w-full items-center justify-center rounded-lg border border-emerald-800 bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            Mua ngay
          </button>

          {(successMessage || errorMessage) && (
            <p
              className={`text-sm font-semibold ${successMessage ? "text-emerald-600" : "text-red-600"}`}
            >
              {successMessage || errorMessage}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/45 p-3 text-xs text-emerald-950 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-5 w-5 text-emerald-700"
                strokeWidth={1.8}
              />
              <div>
                <p className="font-black">Chinh hang</p>
                <p className="text-emerald-800/65">100%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw
                className="h-5 w-5 text-emerald-700"
                strokeWidth={1.8}
              />
              <div>
                <p className="font-black">Doi tra</p>
                <p className="text-emerald-800/65">Trong 7 ngay</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-700" strokeWidth={1.8} />
              <div>
                <p className="font-black">Freeship</p>
                <p className="text-emerald-800/65">Don tu 399K</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Headphones
                className="h-5 w-5 text-emerald-700"
                strokeWidth={1.8}
              />
              <div>
                <p className="font-black">Tu van 24/7</p>
                <p className="text-emerald-800/65">Ho tro nhanh</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeDetailTab === "reviews" && (
        <section ref={reviewsPanelRef} className="grid gap-5">
          <div className="grid gap-5 rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_18px_60px_rgba(2,44,34,0.06)] lg:grid-cols-[220px_1fr_300px] lg:items-center">
            <div className="rounded-xl border border-neutral-100 bg-white p-5 text-center">
              <p className="text-5xl font-black tracking-tight text-emerald-950">
                {averageRating.toFixed(1)}
              </p>
              <div className="mt-3 flex justify-center text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= Math.round(averageRating) ? "fill-current" : "text-neutral-200"}`}
                    strokeWidth={1.6}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold text-neutral-700">
                {totalReviews} danh gia
              </p>
            </div>

            <div className="grid gap-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = Number(
                  reviewSummary.ratingCounts?.[String(rating)] || 0,
                );
                const percent = totalReviews
                  ? Math.round((count / totalReviews) * 100)
                  : 0;

                return (
                  <div
                    key={rating}
                    className="grid grid-cols-[44px_1fr_44px] items-center gap-3 text-sm font-semibold text-neutral-700"
                  >
                    <span className="flex items-center gap-1">
                      {rating}
                      <Star
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        strokeWidth={1.6}
                      />
                    </span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-emerald-800"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-right">{percent}%</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50/70 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 h-6 w-6 shrink-0 text-emerald-800"
                  strokeWidth={1.8}
                />
                <div>
                  <p className="font-black text-emerald-950">
                    Danh gia da mua hang
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    Tat ca danh gia deu tu khach hang da mua hang tai POLOMAN.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            {renderReviewForm()}

            <aside className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_18px_60px_rgba(2,44,34,0.06)]">
              <h2 className="text-lg font-black text-neutral-950">
                Danh gia gan day
              </h2>

              {isReviewsLoading && (
                <div className="mt-5 flex items-center justify-center rounded-xl border border-neutral-100 bg-white py-8 text-emerald-800">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
                </div>
              )}

              {!isReviewsLoading && reviewErrorMessage && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {reviewErrorMessage}
                </div>
              )}

              {!isReviewsLoading &&
                !reviewErrorMessage &&
                reviews.length === 0 && (
                  <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50/70 px-4 py-8 text-center text-sm font-semibold text-neutral-500">
                    San pham chua co danh gia nao.
                  </div>
                )}

              {!isReviewsLoading &&
                !reviewErrorMessage &&
                reviews.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {reviews.slice(0, 4).map((review) => {
                      const reviewId = getReviewId(review);
                      const rating = clampRating(review.rating);
                      const reviewerName = getReviewUserName(review);
                      const reviewerAvatar = getReviewUserAvatar(review);
                      const isOwnReview =
                        userId &&
                        String(getReviewUserId(review)) === String(userId);
                      const images = getReviewImages(review);
                      const comment =
                        review.comment || review.content || review.text || "";
                      const title = review.title || review.reviewTitle || "";
                      const thumbnail = images[0] || mainImage;

                      return (
                        <article
                          key={
                            reviewId ||
                            `${getReviewUserId(review)}-${getCreatedAt(review)}`
                          }
                          className="rounded-xl border border-neutral-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-black text-emerald-800">
                                {reviewerAvatar ? (
                                  <img src={reviewerAvatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  getAvatarInitial(reviewerName)
                                )}
                              </span>
                              <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate font-black text-neutral-950">
                                  {reviewerName}
                                </h3>
                                
                              </div>
                              <div className="mt-2 flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= rating ? "fill-current" : "text-neutral-200"}`}
                                    strokeWidth={1.6}
                                  />
                                ))}
                              </div>
                              </div>
                            </div>
                            {thumbnail && (
                              <a
                                href={thumbnail}
                                target="_blank"
                                rel="noreferrer"
                                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50"
                              >
                                <img
                                  src={thumbnail}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            )}
                          </div>

                          {title && (
                            <p className="mt-3 text-sm font-black text-neutral-900">
                              {title}
                            </p>
                          )}
                          {comment && (
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-700">
                              {comment}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-neutral-500">
                              {formatReviewDate(getCreatedAt(review))}
                            </p>
                            {isOwnReview && reviewId && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(reviewId)}
                                disabled={deletingReviewId === reviewId}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                                aria-label="Xoa danh gia"
                              >
                                {deletingReviewId === reviewId ? (
                                  <Loader2
                                    className="h-4 w-4 animate-spin"
                                    strokeWidth={1.8}
                                  />
                                ) : (
                                  <Trash2
                                    className="h-4 w-4"
                                    strokeWidth={1.8}
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
            </aside>
          </div>
        </section>
      )}

      {activeDetailTab === "fullDetails" && (
        <section className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_18px_60px_rgba(2,44,34,0.06)] sm:p-6">
          <div className="flex gap-2 overflow-x-auto border-b border-neutral-100">
            {[
              ["description", "Mo ta san pham"],
              ["reviews", "Danh gia (128)"],
            ].map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveDetailTab(tabId)}
                className={`shrink-0 border-b-2 px-4 pb-3 text-sm font-black uppercase tracking-[0.08em] transition-colors ${
                  activeDetailTab === tabId
                    ? "border-emerald-800 text-emerald-900"
                    : "border-transparent text-neutral-500 hover:text-emerald-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeDetailTab === "description" ? (
            <div className="pt-5">
              {descriptionParagraphs.length > 0 ? (
                <>
                  <div
                    className={`space-y-3 overflow-hidden text-sm leading-7 text-neutral-700 transition-[max-height] duration-300 ${
                      hasLongDescription && !isDescriptionExpanded
                        ? "max-h-64"
                        : "max-h-[1200px]"
                    }`}
                  >
                    {descriptionParagraphs.map((paragraph, index) => (
                      <p
                        key={`${paragraph.slice(0, 24)}-${index}`}
                        className={
                          index === 0 ? "font-medium text-neutral-800" : ""
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                    <div className="grid gap-2 pt-1 text-emerald-900 sm:grid-cols-2">
                      {[
                        "Chat lieu cao cap",
                        "Form mac gon dang",
                        "Duong may chac chan",
                        "De phoi do hang ngay",
                      ].map((item) => (
                        <p
                          key={item}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check
                            className="h-4 w-4 text-emerald-700"
                            strokeWidth={1.9}
                          />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>

                  {hasLongDescription && (
                    <button
                      type="button"
                      onClick={() =>
                        setIsDescriptionExpanded((current) => !current)
                      }
                      className="mt-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-700 hover:text-emerald-950"
                    >
                      {isDescriptionExpanded ? "Thu gon" : "Xem them mo ta"}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  San pham chua co mo ta.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-emerald-950">
                      Khach hang noi gi
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Tong hop mot vai danh gia mau tren giao dien.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
                    <span className="text-3xl font-black text-emerald-950">
                      4.8
                    </span>
                    <div>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="h-4 w-4 fill-current"
                            strokeWidth={1.6}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-emerald-900/55">
                        128 danh gia
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {reviewSamples.map((review) => (
                    <article
                      key={review.name}
                      className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black text-emerald-950">
                            {review.name}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-emerald-800/60">
                            {review.fit}
                          </p>
                        </div>
                        <span className="flex whitespace-nowrap text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating ? "fill-current" : "text-neutral-200"}`}
                              strokeWidth={1.6}
                            />
                          ))}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {review.text}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleReviewSubmit}
                className="rounded-2xl border border-emerald-100 bg-emerald-950 p-5 text-white shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">
                  Viet danh gia
                </p>
                <h2 className="mt-2 text-xl font-black">
                  Chia se trai nghiem cua ban
                </h2>

                <div className="mt-5">
                  <p className="text-sm font-bold text-white/80">Cham sao</p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`transition-transform hover:scale-110 ${
                          star <= reviewRating
                            ? "text-amber-300"
                            : "text-white/20"
                        }`}
                        aria-label={`Chon ${star} sao`}
                      >
                        <Star
                          className="h-8 w-8 fill-current"
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-5 grid gap-2">
                  <span className="text-sm font-bold text-white/80">
                    Binh luan
                  </span>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={5}
                    placeholder="San pham mac len the nao, form co vua khong..."
                    className="resize-none rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-emerald-300"
                  />
                </label>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white/80">
                      Anh danh gia
                    </p>
                    <span className="text-xs text-white/45">
                      {reviewImages.length}/4 anh
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {reviewImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-white/10"
                      >
                        <img
                          src={image.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(image.id)}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/75 text-xs font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Xoa anh"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    {reviewImages.length < 4 && (
                      <button
                        type="button"
                        onClick={() => reviewImageInputRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-emerald-300/70 bg-white/8 text-2xl font-light text-emerald-100 transition-colors hover:bg-white/14"
                        aria-label="Them anh danh gia"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <input
                    ref={reviewImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReviewImagesChange}
                    className="sr-only"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-950 transition-colors hover:bg-emerald-200"
                >
                  Xem truoc danh gia
                </button>
                <p className="mt-3 text-xs leading-5 text-white/45">
                  Giao dien nay chi luu tam tren man hinh, chua gui API.
                </p>
              </form>
            </div>
          )}
        </section>
      )}

      {recommendedProducts.length > 0 && (
        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">
                Goi y tiep theo
              </p>
              <h2 className="mt-2 text-2xl font-black text-emerald-950">
                Co the ban se thich
              </h2>
            </div>
            <Link
              to="/products"
              className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700 hover:text-emerald-950"
            >
              Xem tat ca
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedProducts.map((item) => {
              const itemImage = getProductImage(item);
              const itemPrice = getProductPrice(item);

              return (
                <Link
                  key={getProductId(item) || getProductSlug(item)}
                  to={`/products/${getProductSlug(item)}`}
                  className="group overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/35 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/8"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-white">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={getProductName(item)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-emerald-950 group-hover:text-emerald-700">
                      {getProductName(item)}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-emerald-800">
                        {formatCurrency(item.salePrice || itemPrice)}
                      </span>
                      {item.salePrice && (
                        <span className="text-xs font-semibold text-neutral-400 line-through">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {activeDetailTab === "legacy" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]">
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 border-b border-emerald-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/65">
                  Danh gia san pham
                </p>
                <h2 className="mt-2 text-2xl font-black text-emerald-950">
                  Khach hang noi gi
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-3xl font-black text-emerald-950">
                  4.8
                </span>
                <div>
                  <div className="text-sm text-amber-400">★★★★★</div>
                  <p className="text-xs font-semibold text-emerald-900/55">
                    128 danh gia
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {reviewSamples.map((review) => (
                <article
                  key={review.name}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-emerald-950">
                        {review.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-emerald-800/60">
                        {review.fit}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-amber-400">
                      {"★".repeat(review.rating)}
                      <span className="text-emerald-100">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-emerald-900/70">
                    {review.text}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleReviewSubmit}
            className="rounded-3xl border border-emerald-100 bg-emerald-950 p-5 text-white shadow-sm sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">
              Viet danh gia
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Chia se trai nghiem cua ban
            </h2>

            <div className="mt-5">
              <p className="text-sm font-bold text-white/80">Cham sao</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-4xl leading-none transition-transform hover:scale-110 ${
                      star <= reviewRating ? "text-amber-300" : "text-white/20"
                    }`}
                    aria-label={`Chon ${star} sao`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold text-white/80">Binh luan</span>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={5}
                placeholder="San pham mac len the nao, form co vua khong..."
                className="resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-emerald-300"
              />
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white/80">Anh danh gia</p>
                <span className="text-xs text-white/45">
                  {reviewImages.length}/4 anh
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {reviewImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-white/10"
                  >
                    <img
                      src={image.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeReviewImage(image.id)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/75 text-xs font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Xoa anh"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {reviewImages.length < 4 && (
                  <button
                    type="button"
                    onClick={() => reviewImageInputRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-emerald-300/70 bg-white/8 text-2xl font-light text-emerald-100 transition-colors hover:bg-white/14"
                    aria-label="Them anh danh gia"
                  >
                    +
                  </button>
                )}
              </div>
              <input
                ref={reviewImageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleReviewImagesChange}
                className="sr-only"
              />
            </div>

            <button
              type="submit"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-950 transition-colors hover:bg-emerald-200"
            >
              Xem truoc danh gia
            </button>
            <p className="mt-3 text-xs leading-5 text-white/45">
              Giao dien nay chi luu tam tren man hinh, chua gui API.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
