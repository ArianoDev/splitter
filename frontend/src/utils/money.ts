export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${euros.toLocaleString("it-IT")},${rem.toString().padStart(2, "0")} €`;
}

/**
 * Parses a human euro string into integer cents.
 * Accepts: "12", "12.3", "12,30", " 1.234,56 "
 */
export function parseEuroToCents(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Remove spaces, normalize decimal separator to "."
  const normalized = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [intPart, decPart = ""] = normalized.split(".");
  const euros = Number(intPart);
  const cents = Number((decPart + "00").slice(0, 2));
  if (!Number.isFinite(euros) || !Number.isFinite(cents)) return null;

  return euros * 100 + cents;
}
