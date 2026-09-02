const ORDER_NUMBER_PATTERN = /^SSS-\d{4}-\d{5}$/;

export function formatOrderNumber(date: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) {
    throw new Error("Order sequence must be between 1 and 99999.");
  }

  return `SSS-${date.getFullYear()}-${String(sequence).padStart(5, "0")}`;
}

export function isOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}
