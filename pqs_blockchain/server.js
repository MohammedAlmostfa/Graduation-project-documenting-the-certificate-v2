import 'dotenv/config.js';
import { createApp } from './src/app.js';
import { initServices } from './src/bootstrap.js';
import { logger } from './src/utils/logger.js';

if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ERROR: ENCRYPTION_KEY environment variable is not set!');
  console.error('Please create a .env file or use .env.example with ENCRYPTION_KEY value');
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const app = createApp();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

const startServer = async () => {
  await initServices();
  app.listen(port, () => {
    logger.info(`🔄 الخادم يعمل على http://localhost:${port}`);
    logger.info('📊 نظام الشهادات الجامعية جاهز للاستخدام');
  });
};

await startServer();

export default app;

