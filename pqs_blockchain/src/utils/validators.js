/**
 * Validators Module - Centralized Condition Checks
 * =================================================
 * يجمع كل الشروط المتكررة والفحوصات المشتركة في مكان واحد
 * DRY Principle: Single source of truth for all validation logic
 *
 * NOTE: This is a CLEANED version with unused functions removed.
 * For the original version with all utility functions, use the backup.
 */

// ============================================================================
// NULL/EMPTY CHECKS
// ============================================================================

/**
 * تحقق من أن الـ array أو list فارغة أو لا توجد
 * @param {any[]} arr - المصفوفة للفحص
 * @returns {boolean} true إذا كانت فارغة أو لا توجد
 */
export function isEmptyArray(arr) {
  return !arr || !Array.isArray(arr) || arr.length === 0;
}

/**
 * تحقق من أن الـ rows من قاعدة البيانات فارغة أو لا توجد
 * @param {any[]} rows - الصفوف من قاعدة البيانات
 * @returns {boolean} true إذا كانت فارغة
 */
export function hasNoRows(rows) {
  return !rows || !Array.isArray(rows) || rows.length === 0;
}

/**
 * تحقق من أن الكائن فارغ (null أو undefined)
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان فارغاً
 */
export function isEmpty(val) {
  return val == null;
}

/**
 * تحقق من أن القيمة موجودة وليست فارغة
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كانت موجودة
 */
export function hasValue(val) {
  return val != null;
}

// ============================================================================
// FALLBACK/DEFAULT VALUES
// ============================================================================

/**
 * الحصول على أول قيمة غير فارغة من قائمة القيم
 * @param  {...any} values - القيم للتحقق منها
 * @returns {any} أول قيمة غير فارغة أو null
 */
export function firstNonNull(...values) {
  return values.find(v => v != null) ?? null;
}

// ============================================================================
// TYPE CHECKS & CONVERSIONS
// ============================================================================

/**
 * تحقق من أن القيمة عبارة عن موجود/مصفوفة
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان مصفوفة
 */
export function isArray(val) {
  return Array.isArray(val);
}

/**
 * تحقق من أن القيمة عبارة عن كائن (وليس null)
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان كائناً
 */
export function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * تحقق من أن القيمة عبارة عن نص
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كانت نص
 */
export function isString(val) {
  return typeof val === 'string';
}

/**
 * تحويل القيمة إلى رقم عشري (float)
 * @param {any} val - القيمة المراد تحويلها
 * @returns {number|null} الرقم العشري أو null
 */
export function toFloatSafe(val) {
  if (val == null) return null;
  if (typeof val === 'number') return parseFloat(val);
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ============================================================================
// DATE CHECKS
// ============================================================================

/**
 * احصل على تاريخ أو تاريخ حالي
 * @param {any} val - القيمة
 * @returns {Date} التاريخ أو الحالي
 */
export function dateOrNow(val) {
  if (!val) return new Date();
  if (val instanceof Date) {
    const date = new Date(val);
    return !isNaN(date.getTime()) ? date : new Date();
  }
  const date = new Date(val);
  return !isNaN(date.getTime()) ? date : new Date();
}
