// Main application server entry point

import 'dotenv/config.js';
import express from 'express';
import certificateRoutes from './src/routes/certificates.js';
import blockchainRoutes from './src/routes/blockchain.js';
import adminRoutes from './src/routes/admin.js';
import { logger } from './src/utils/logger.js';
import { ApiResponse } from './src/utils/apiResponse.js';
import { AppError } from './src/utils/errors.js';

if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ERROR: ENCRYPTION_KEY environment variable is not set!');
  console.error('Please create a .env file with ENCRYPTION_KEY value');
  process.exit(1);
}
import {
  certificateService,
  keyService,
  keyManagementService,
  blockchainService
} from './src/bootstrap.js';

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON and URL-encoded bodies
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      req.rawBody = buf && buf.toString();
    } catch (e) {
      req.rawBody = undefined;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Mount API routes
app.use('/api/certificates', certificateRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json(ApiResponse.success('🏫 نظام الشهادات الجامعية الموزع', {
    version: '1.0.0',
    endpoints: {
      certificates: '/api/certificates',
      blockchain: '/api/blockchain',
      admin: '/api/admin'
    }
  }));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    const raw = req.rawBody || (error && error.body) || '';
    const truncated = typeof raw === 'string' && raw.length > 1000
      ? raw.slice(0, 1000) + '...[truncated]'
      : raw;

    logger.error('JSON parsing error:', {
      message: error.message,
      path: req.path,
      ip: req.ip,
      rawBody: truncated
    });

    return res.status(400).json(ApiResponse.error('طلب غير صالح - JSON غير صالح', 'BAD_REQUEST', error.message));
  }

  if (error instanceof AppError) {
    logger.error('Application error:', error);
    return res.status(error.statusCode).json(ApiResponse.error(error.message, error.errorCode, error.details));
  }

  logger.error('Server error:', error);
  res.status(500).json(ApiResponse.error('خطأ في الخادم الداخلي', 'INTERNAL_ERROR', error.message));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(ApiResponse.error('المسار غير موجود', 'NOT_FOUND', req.path));
});

// Start server
app.listen(port, () => {
  logger.info(`🔄 الخادم يعمل على http://localhost:${port}`);
  logger.info('📊 نظام الشهادات الجامعية جاهز للاستخدام');
});

export default app;
export { certificateService, keyService, keyManagementService, blockchainService };
