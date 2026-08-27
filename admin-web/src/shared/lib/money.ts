const CURRENCY = 'BYN';
const LOCALE = 'ru-RU';

/** Копейки BYN → строка «1 020,00 BYN» (формат только на границе UI) */
export function formatMoney(priceCents: number): string {
  const amount = priceCents / 100;

  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${CURRENCY}`;
  }
}

/** Округление как у бэкенда: round(price × (100 − discount) / 100) */
export function calculateDiscountedCents(
  priceCents: number,
  discountPercent: number | null | undefined,
): number {
  if (!discountPercent) return priceCents;
  return Math.round((priceCents * (100 - discountPercent)) / 100);
}
