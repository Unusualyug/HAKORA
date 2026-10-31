export const ENQUIRY_STATUSES = [
  'NEW','CONTACTED','QUOTATION_SENT','CONFIRMED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED',
] as const;

export const ORDER_STATUSES = [
  'PENDING_CONFIRMATION','QUOTATION_SENT','CONFIRMED','PAYMENT_PENDING','PROCESSING','PRINTING',
  'READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','CANCELLED',
] as const;

export const DELIVERY_STATUSES = [
  'NOT_SCHEDULED','SCHEDULED','READY','OUT_FOR_DELIVERY','DELIVERED','FAILED',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUOTATION_SENT: 'Quotation Sent', CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
  PENDING_CONFIRMATION: 'Pending Confirmation', PAYMENT_PENDING: 'Payment Pending',
  PROCESSING: 'Processing', PRINTING: 'Printing', READY_FOR_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered',
  NOT_SCHEDULED: 'Not Scheduled', SCHEDULED: 'Scheduled', READY: 'Ready', FAILED: 'Failed',
  PENDING: 'Pending', APPROVED: 'Approved', HIDDEN: 'Hidden',
  DRAFT: 'Draft', SENT: 'Sent', VIEWED: 'Viewed', ACCEPTED: 'Accepted',
  PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', SUPERSEDED: 'Superseded',
  SUCCESS: 'Successful', REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partially Refunded',
  PROCESSED: 'Processed', MANUAL: 'Manual', RAZORPAY: 'Razorpay',
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', OTHER: 'Other',
  BLACK_WHITE: 'Black & White', COLOR: 'Color', MIXED: 'Mixed',
  SINGLE: 'Single-sided', DOUBLE: 'Double-sided',
  NONE: 'No Binding', SPIRAL: 'Spiral Binding', HARD: 'Hard Binding', SOFT: 'Soft Binding', STAPLE: 'Staple',
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-amber-100 text-amber-800',
  QUOTATION_SENT: 'bg-purple-100 text-purple-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
  PENDING_CONFIRMATION: 'bg-blue-100 text-blue-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  PRINTING: 'bg-indigo-100 text-indigo-800',
  READY_FOR_DELIVERY: 'bg-teal-100 text-teal-800',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  NOT_SCHEDULED: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  READY: 'bg-teal-100 text-teal-800',
  FAILED: 'bg-red-100 text-red-800',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  HIDDEN: 'bg-gray-200 text-gray-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  VIEWED: 'bg-sky-100 text-sky-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  PARTIALLY_PAID: 'bg-lime-100 text-lime-800',
  PAID: 'bg-green-100 text-green-800',
  SUPERSEDED: 'bg-gray-200 text-gray-600',
  SUCCESS: 'bg-green-100 text-green-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-700',
};
