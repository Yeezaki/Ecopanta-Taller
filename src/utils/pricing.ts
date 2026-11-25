export interface PriceBounds {
  min: number;
  max: number;
  effectiveMargin: number;
}

export function calculatePriceBounds(
  referencePrice: number,
  defaultMarginPercent: number,
  marginOverride?: number | null
): PriceBounds {
  const effectiveMargin =
    marginOverride !== undefined && marginOverride !== null
      ? marginOverride
      : defaultMarginPercent;
  const min = Math.ceil(referencePrice * (1 - effectiveMargin));
  const max = Math.floor(referencePrice * (1 + effectiveMargin));
  return { min, max, effectiveMargin };
}

export function isPriceWithinBounds(
  price: number,
  referencePrice: number,
  defaultMarginPercent: number,
  marginOverride?: number | null
): boolean {
  const { min, max } = calculatePriceBounds(
    referencePrice,
    defaultMarginPercent,
    marginOverride
  );
  return price >= min && price <= max;
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}