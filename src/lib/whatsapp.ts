export function waLink(number: string, message: string) {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export const WA_MESSAGES = {
  academic: (brand: string) => `Hello ${brand}, I need help with an academic requirement.`,
  bulk: (brand: string) => `Hello ${brand}, I am interested in bulk printing. Please share the quotation process.`,
  visited: (brand: string) => `Hello, I visited ${brand} and need academic assistance.`,
  bulkQuote: () => `Hello, I need a bulk printing quotation.`,
  orderFollowUp: (orderId: string) => `Hello, I would like to know the status of my order ${orderId}.`,
  adminToStudent: (name: string, enquiryId: string) =>
    `Hello ${name}, we received your enquiry ${enquiryId}. We would like to discuss your requirements.`,
};
