import express from 'express';
import certificateRoutes from './routes/certificates.js';
import blockchainRoutes from './routes/blockchain.js';
import adminRoutes from './routes/admin.js';
import { logger } from './utils/logger.js';
import { ApiResponse } from './utils/apiResponse.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const registerGlobalMiddleware = (app) => {
  app.use(express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      if (buf) req.rawBody = buf.toString();
    }
  }));

  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });
};

const registerRoutes = (app) => {
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/blockchain', blockchainRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/', (_req, res) => {
    res.json(ApiResponse.success('🏫 نظام الشهادات الجامعية الموزع', {
      version: process.env.npm_package_version || '1.0.0',
      endpoints: {
        certificates: '/api/certificates',
        blockchain: '/api/blockchain',
        admin: '/api/admin'
      }
    }));
  });
};

export const createApp = () => {
  const app = express();
  registerGlobalMiddleware(app);
  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

