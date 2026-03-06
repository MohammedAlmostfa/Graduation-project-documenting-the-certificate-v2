/**
 * Validators Module - Centralized Condition Checks
 * =================================================
 * يجمع كل الشروط المتكررة والفحوصات المشتركة في مكان واحد
 * DRY Principle: Single source of truth for all validation logic
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

/**
 * تحويل قيمة إلى قيمة افتراضية إذا كانت فارغة
 * @param {any} val - القيمة
 * @param {any} defaultVal - القيمة الافتراضية
 * @returns {any} القيمة أو الافتراضية
 */
export function coalesce(val, defaultVal) {
  return val != null ? val : defaultVal;
}

/**
 * إذا كانت القيمة فارغة، استخدم الافتراضية
 * @param {any} val - القيمة
 * @param {Function} defaultFactory - دالة لإنشاء القيمة الافتراضية
 * @returns {any} القيمة أو نتيجة المصنع
 */
export function orElse(val, defaultFactory) {
  return val != null ? val : defaultFactory();
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
 * تحقق من أن القيمة عبارة عن رقم أو يمكن تحويلها إلى رقم
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كانت رقم صحيح
 */
export function isNumber(val) {
  return typeof val === 'number' && !isNaN(val);
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
 * تحويل القيمة إلى رقم آمن
 * @param {any} val - القيمة المراد تحويلها
 * @returns {number|null} الرقم أو null
 */
export function toNumberSafe(val) {
  if (isNumber(val)) return val;
  if (isString(val)) {
    const num = Number(val);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * تحويل القيمة إلى رقم عشري (float)
 * @param {any} val - القيمة المراد تحويلها
 * @returns {number|null} الرقم العشري أو null
 */
export function toFloatSafe(val) {
  if (val == null) return null;
  if (isNumber(val)) return parseFloat(val);
  if (isString(val)) {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ============================================================================
// CACHE CHECKS
// ============================================================================

/**
 * تحقق من القيمة المخزنة مؤقتاً وتعيدها أو تحسبها
 * @param {object} obj - الكائن الذي يحتوي على الـ cache
 * @param {string} key - مفتاح الـ cache
 * @param {Function} computeFn - دالة لحساب القيمة إذا لم تكن مخزنة
 * @returns {any} القيمة المخزنة أو المحسوبة
 */
export function getOrCompute(obj, key, computeFn) {
  if (obj[key] !== undefined) {
    return obj[key];
  }
  const result = computeFn();
  obj[key] = result;
  return result;
}

/**
 * تحقق من القيمة المخزنة مؤقتاً بشكل غير متزامن
 * @param {object} obj - الكائن الذي يحتوي على الـ cache
 * @param {string} key - مفتاح الـ cache
 * @param {Function} computeFn - دالة async لحساب القيمة
 * @returns {Promise<any>} القيمة المخزنة أو المحسوبة
 */
export async function getOrComputeAsync(obj, key, computeFn) {
  if (obj[key] !== undefined) {
    return obj[key];
  }
  const result = await computeFn();
  obj[key] = result;
  return result;
}

// ============================================================================
// STRING CHECKS
// ============================================================================

/**
 * تحقق من أن النص تم ملؤه (ليس فارغاً)
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان نص غير فارغ
 */
export function isFilledString(val) {
  return isString(val) && val.trim().length > 0;
}

/**
 * تحقق من أن النص فارغ أو لم يتم ملؤه
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان فارغاً أو لم يتم ملؤه
 */
export function isEmptyString(val) {
  return !isString(val) || val.trim().length === 0;
}

/**
 * احصل على النص مع تنظيف أو قيمة افتراضية
 * @param {any} val - القيمة
 * @param {string} defaultVal - القيمة الافتراضية
 * @returns {string} النص المنظف أو الافتراضي
 */
export function toString(val, defaultVal = '') {
  return isFilledString(val) ? val.trim() : defaultVal;
}

// ============================================================================
// DATE CHECKS
// ============================================================================

/**
 * تحقق من أن القيمة عبارة عن تاريخ صحيح
 * @param {any} val - القيمة للفحص
 * @returns {boolean} true إذا كان تاريخاً صحيحاً
 */
export function isValidDate(val) {
  if (!(val instanceof Date)) return false;
  return !isNaN(val.getTime());
}

/**
 * تحويل القيمة إلى تاريخ آمن
 * @param {any} val - القيمة المراد تحويلها
 * @returns {Date|null} التاريخ أو null
 */
export function toDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const date = new Date(val);
  return isValidDate(date) ? date : null;
}

/**
 * احصل على تاريخ أو تاريخ حالي
 * @param {any} val - القيمة
 * @returns {Date} التاريخ أو الحالي
 */
export function dateOrNow(val) {
  const date = toDateSafe(val);
  return date || new Date();
}

// ============================================================================
// CONDITIONALS FOR COMMON PATTERNS
// ============================================================================

/**
 * تنفيذ دالة إذا كانت حالة معينة صحيحة
 * @param {boolean} condition - الشرط
 * @param {Function} fn - الدالة المراد تنفيذها
 * @returns {any} نتيجة الدالة أو undefined
 */
export function ifTrue(condition, fn) {
  return condition ? fn() : undefined;
}

/**
 * تنفيذ دالة واحدة إذا كان الشرط صحيح، والأخرى إذا كان خاطئاً
 * @param {boolean} condition - الشرط
 * @param {Function} onTrue - الدالة إذا كان الشرط صحيح
 * @param {Function} onFalse - الدالة إذا كان الشرط خاطئاً
 * @returns {any} نتيجة إحدى الدالتين
 */
export function ifElse(condition, onTrue, onFalse) {
  return condition ? onTrue() : onFalse();
}

/**
 * تنفيذ دالة إذا كانت القيمة موجودة
 * @param {any} val - القيمة للفحص
 * @param {Function} fn - الدالة المراد تنفيذها بالقيمة
 * @returns {any} نتيجة الدالة أو undefined
 */
export function ifPresent(val, fn) {
  return hasValue(val) ? fn(val) : undefined;
}

/**
 * تنفيذ دالة إذا كانت القيمة فارغة
 * @param {any} val - القيمة للفحص
 * @param {Function} fn - الدالة المراد تنفيذها
 * @returns {any} نتيجة الدالة أو undefined
 */
export function ifEmpty(val, fn) {
  return isEmpty(val) ? fn() : undefined;
}

// ============================================================================
// OBJECT PROPERTY CHECKS
// ============================================================================

/**
 * احصل على خاصية الكائن بأمان (مع fallback)
 * @param {object} obj - الكائن
 * @param {string} path - مسار الخاصية (مثل "student.name")
 * @param {any} defaultVal - القيمة الافتراضية
 * @returns {any} قيمة الخاصية أو الافتراضية
 */
export function safeGet(obj, path, defaultVal = null) {
  if (!obj || !isString(path)) return defaultVal;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    current = current?.[key];
    if (current == null) return defaultVal;
  }
  return current ?? defaultVal;
}

/**
 * تحقق من وجود خاصية في الكائن
 * @param {object} obj - الكائن
 * @param {string} key - مفتاح الخاصية
 * @returns {boolean} true إذا كانت الخاصية موجودة وغير فارغة
 */
export function hasProperty(obj, key) {
  return obj && hasValue(obj[key]);
}

/**
 * احصل على قيمة الخاصية أو قيمة افتراضية
 * @param {object} obj - الكائن
 * @param {string} key - مفتاح الخاصية
 * @param {any} defaultVal - القيمة الافتراضية
 * @returns {any} قيمة الخاصية أو الافتراضية
 */
export function getProperty(obj, key, defaultVal = null) {
  return hasProperty(obj, key) ? obj[key] : defaultVal;
}

// ============================================================================
// VALIDATION CHAINS
// ============================================================================

/**
 * تحقق من أن جميع الشروط صحيحة
 * @param  {...boolean} conditions - قائمة الشروط
 * @returns {boolean} true إذا كانت جميع الشروط صحيحة
 */
export function allTrue(...conditions) {
  return conditions.every(c => c === true);
}

/**
 * تحقق من أن أياً من الشروط صحيحة
 * @param  {...boolean} conditions - قائمة الشروط
 * @returns {boolean} true إذا كانت أي شرط صحيح
 */
export function anyTrue(...conditions) {
  return conditions.some(c => c === true);
}

/**
 * تحقق من أن جميع المقاييس موجودة
 * @param  {...any} items - قائمة العناصر للفحص
 * @returns {boolean} true إذا كان جميعها موجود
 */
export function allPresent(...items) {
  return items.every(item => hasValue(item));
}

/**
 * تحقق من أن أي عنصر موجود
 * @param  {...any} items - قائمة العناصر للفحص
 * @returns {boolean} true إذا كان أي عنصر موجود
 */
export function anyPresent(...items) {
  return items.some(item => hasValue(item));
}

/**
 * تحقق من أن جميع الشروط صحيحة، وإذا لم تكن، الق استثناءً
 * @param {boolean} condition - الشرط
 * @param {string} message - رسالة الخطأ
 * @throws {Error} إذا كان الشرط خاطئاً
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// COLLECTION OPERATIONS
// ============================================================================

/**
 * أنظف مصفوفة من القيم الفارغة
 * @param {any[]} arr - المصفوفة
 * @returns {any[]} مصفوفة منظفة
 */
export function cleanArray(arr) {
  if (!isArray(arr)) return [];
  return arr.filter(item => hasValue(item));
}

/**
 * حول كائن إلى مصفوفة من المفاتيح والقيم
 * @param {object} obj - الكائن
 * @returns {Array<[string, any]>} مصفوفة [key, value] pairs
 */
export function objectEntries(obj) {
  if (!isObject(obj)) return [];
  return Object.entries(obj);
}

/**
 * أزل الخصائص الفارغة من كائن
 * @param {object} obj - الكائن
 * @returns {object} كائن منظف
 */
export function cleanObject(obj) {
  if (!isObject(obj)) return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (hasValue(value)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * دمج عدة كائنات مع أولوية الكائنات الأخيرة
 * @param  {...object} objects - قائمة الكائنات
 * @returns {object} الكائن المدمج
 */
export function mergeObjects(...objects) {
  return objects.reduce((acc, obj) => {
    if (isObject(obj)) {
      Object.assign(acc, obj);
    }
    return acc;
  }, {});
}
