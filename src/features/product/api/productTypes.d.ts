export interface ApiResponse<T> {
  type: string;
  title: string;
  status: number;
  code: string;
  message: string;
  data: T;
  path: string;
  timestamp: string;
}

export interface ProductCursorPageResponse {
  items: Product[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: number | string;
  salePrice: number | string | null;
  active: boolean;
  colors: ColorVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ColorVariant {
  id: string;
  colorName: string;
  colorCode: string;
  images: ProductImage[];
  sizes: SizeVariant[];
}

export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  main: boolean;
  sortOrder: number;
}

export interface SizeVariant {
  id: string;
  size: string;
  sku: string;
  quantity: number;
}
