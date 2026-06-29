export interface RefundResponse {
  id?: string;
  _id?: string;
  refundId?: string;
  orderId?: string;
  userId?: string;
  username?: string;
  userName?: string;
  customerName?: string;
  type?: string;
  status?: string;
  reason?: string;
  refundAmount?: number | string;
  productId?: string;
  productName?: string;
  colorId?: string;
  colorName?: string;
  currentSizeId?: string;
  currentSizeName?: string;
  requestedSizeId?: string;
  requestedSizeName?: string;
  imageUrls?: string[];
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  transferContent?: string;
  paymentMethod?: string;
  provider?: string;
  paymentProvider?: string;
  providerResponseMessage?: string;
  requestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
  refundedAt?: string;
  completedAt?: string;
}

export interface RefundCursorPageResponse {
  items: RefundResponse[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}
