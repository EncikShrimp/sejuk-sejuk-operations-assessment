const MONEY_INPUT_PATTERN = /^\d+(?:\.\d{1,3})?$/;

export function centsFromInput(value: string): number {
  const trimmed = value.trim();
  if (!MONEY_INPUT_PATTERN.test(trimmed)) {
    throw new Error("Enter a non-negative amount with up to three decimal places.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const fractionInThousandths = Number(fraction.padEnd(3, "0"));
  const cents = Number(whole) * 100 + Math.round(fractionInThousandths / 10);

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Amount is outside the supported range.");
  }

  return cents;
}

export function assertNonNegativeCents(value: number, fieldName = "Amount"): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number of cents.`);
  }
  return value;
}

export function calculateFinalAmount({
  quotedAmountCents,
  extraChargesCents,
}: {
  quotedAmountCents: number;
  extraChargesCents: number;
}): number {
  return assertNonNegativeCents(quotedAmountCents, "Quoted amount") +
    assertNonNegativeCents(extraChargesCents, "Extra charges");
}

export function formatRinggit(cents: number): string {
  assertNonNegativeCents(cents);
  return `RM${(cents / 100).toFixed(2)}`;
}
