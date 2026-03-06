
/**
 * asyncWrapper
 * ------------
 * Small helper that wraps async route handlers / controller methods so errors
 * are automatically propagated to Express error middleware instead of
 * repeating try/catch blocks everywhere.
 *
 * Usage:
 *   import { asyncWrapper } from '../utils/asyncWrapper.js';
 *
 *   app.get('/foo', asyncWrapper(async (req, res) => {
 *       // your code, throw or reject on failure
 *   }));
 */
export function asyncWrapper(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
