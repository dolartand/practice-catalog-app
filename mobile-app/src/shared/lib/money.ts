const CURRENCY = 'BYN';

export function formatMoney(priceCents: number, locale: string): string {
  const amount = priceCents / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} BYN`;
  }
}

export function calculateDiscountedCents(priceCents: number, discountPercent: number | null | undefined): number {
  if (!discountPercent) return priceCents;
  return Math.round((priceCents * (100 - discountPercent)) / 100);
}