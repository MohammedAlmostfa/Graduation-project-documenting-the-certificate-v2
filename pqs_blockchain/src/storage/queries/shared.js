// shared.js
import {
  isArray,
  isObject,
  isString,
  hasValue,
  isEmpty,
  isEmptyArray,
  hasNoRows,
  firstNonNull,
  toFloatSafe,
  dateOrNow
} from '../../utils/validators.js';

export { hasNoRows };
import { certificateStatus, certificateStatusLabels } from '../../config/security.js';

export function serializeJSON(val) {
  if (isObject(val) || Array.isArray(val)) {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return Array.isArray(val) ? '[]' : '{}';
    }
  }
  return val;
}

export function deserializeJSON(val) {
  if (!isString(val)) return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return val;
  }
}

export function normalizeStatus(value) {
  if (!hasValue(value)) return value;
  if (Object.values(certificateStatus).includes(value)) return value;
  const entry = Object.entries(certificateStatusLabels).find(([, label]) => label === value);
  return entry ? entry[0] : value;
}

export function formatDateNoTZ(date) {
  if (!hasValue(date)) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateTimeNoTZ(date) {
  if (!hasValue(date)) return null;
  const y  = date.getUTCFullYear();
  const m  = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

export function formatDateIfPresent(dateField) {
  return hasValue(dateField) ? formatDateNoTZ(dateField) : null;
}

export function formatDateTimeIfPresent(dateTimeField) {
  return hasValue(dateTimeField) ? formatDateTimeNoTZ(dateTimeField) : null;
}

