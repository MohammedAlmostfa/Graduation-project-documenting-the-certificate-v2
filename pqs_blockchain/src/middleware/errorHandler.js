import { ApiResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json(ApiResponse.error('المسار غير موجود', 'NOT_FOUND', req.originalUrl));
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    logger.error('JSON parsing error', {
      message: error.message,
      path: req.path,
      ip: req.ip,
      rawBody: req.rawBody || ''
    });

    return res.status(400).json(ApiResponse.error('طلب غير صالح - JSON غير صالح', 'BAD_REQUEST', error.message));
  }

  if (error instanceof AppError) {
    logger.error('Application error', error);
    return res.status(error.statusCode).json(ApiResponse.error(error.message, error.errorCode, error.details));
  }

  logger.error('Server error', error instanceof Error ? { message: error.message, stack: error.stack } : error);
  res.status(500).json(ApiResponse.error('خطأ في الخادم الداخلي', 'INTERNAL_ERROR', error instanceof Error ? error.message : String(error)));
}
