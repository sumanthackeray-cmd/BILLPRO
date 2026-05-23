/**
 * Shared Smart Filter helpers for consistent, predictable filtering behavior across pages.
 *
 * Note: This file is JS, but the project is being typechecked strictly. Use JSDoc types
 * to avoid "implicitly has an 'any' type" errors.
 *
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSelect(value) {
  // Treat "All/ALL/all" uniformly for comparisons
  const v = normalizeText(value);
  return v === "all" ? "ALL" : v;
}

/**
 * @param {{ query: unknown, fields: unknown[] }} params
 * @returns {boolean}
 */
export function matchesQuery({ query, fields }) {
  const q = normalizeText(query);
  if (!q) return true;
  if (!Array.isArray(fields) || fields.length === 0) return false;

  return fields.some((f) => normalizeText(f).includes(q));
}

/**
 * @param {{ value: unknown, selected: unknown, defaultValue?: unknown }} params
 * @returns {boolean}
 */
export function matchesSelect({ value, selected, defaultValue = "ALL" }) {
  const sel = normalizeSelect(selected);
  const v = normalizeSelect(value);
  const def = normalizeSelect(defaultValue);

  if (sel === def) return true;
  return v === sel;
}

/**
 * @param {unknown} id
 * @param {number} index
 * @returns {string}
 */
export function makeStableKey(id, index) {
  if (id === null || id === undefined || id === "") return `idx-${index}`;
  return String(id);
}
