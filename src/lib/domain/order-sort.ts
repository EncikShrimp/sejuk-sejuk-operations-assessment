import type { ServiceOrder } from "./types";

/** Returns a new array so register rendering never mutates workflow state. */
export function sortOrdersNewestCreatedFirst(orders: readonly ServiceOrder[]): ServiceOrder[] {
  return [...orders].sort((first, second) => {
    const createdAtDifference = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    return createdAtDifference || second.orderNumber.localeCompare(first.orderNumber, undefined, { numeric: true });
  });
}
