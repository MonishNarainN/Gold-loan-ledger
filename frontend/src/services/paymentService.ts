import { paymentAPI } from "@/lib/api";

import type { Transaction } from "@/lib/api";

export const paymentService = {
  createOrder: async (payload: { loanId: string; amount: number; paymentType?: Transaction["type"] }) => {
    const response = await paymentAPI.createOrder(payload);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    return { success: false, message: response.error || response.message || "Failed to create payment order" };
  },
  verifyPayment: async (payload: {
    transactionId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const response = await paymentAPI.verifyPayment(payload);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    return { success: false, message: response.error || response.message || "Payment verification failed" };
  },
};

