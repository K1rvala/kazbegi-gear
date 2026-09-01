// Shared between admin.js (writes stock) and orders.js (decrements stock on
// reservation) so both compute the same doc ID for a given item + type.
export function slugifyStockType(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function stockDocId(itemKey, type) {
  return `${itemKey}__${slugifyStockType(type)}`;
}
