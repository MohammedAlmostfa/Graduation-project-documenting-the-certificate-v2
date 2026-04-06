import 'dotenv/config.js';
import { createApp } from './src/app.js';
import { initServices } from './src/bootstrap.js';
import { logger } from './src/utils/logger.js';
import { telegramService } from './src/services/telegram.service.js';

if (!process.env.ENCRYPTION_KEY) {
  logger.error('❌ ERROR: ENCRYPTION_KEY environment variable is not set!');
  logger.error('Please create a .env file or use .env.example with ENCRYPTION_KEY value');
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const app = createApp();

/**
 * Global Error Handlers
 * Catches unhandled promise rejections and exceptions
 * Sends notifications to Telegram for production monitoring
 */

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  logger.error('Unhandled promise rejection', { reason: errorMessage });

  // Send to Telegram if enabled
  await telegramService.error('🔴 Unhandled Promise Rejection', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception', error);

  // Send to Telegram if enabled
  await telegramService.error('🔴 CRITICAL: Uncaught Exception', error);

  // Exit process after logging (this is critical)
  setTimeout(() => process.exit(1), 1000);
});

const startServer = async () => {
  await initServices();
  app.listen(port, async () => {
    logger.info(`🔄 الخادم يعمل على http://localhost:${port}`);
    logger.info('📊 نظام الشهادات الجامعية جاهز للاستخدام');

    // Send startup notification to Telegram
    await telegramService.info(
      `🚀 *Server Started*\n\n` +
      `*Port:* \`${port}\`\n` +
      `*Environment:* \`${process.env.NODE_ENV || 'development'}\`\n` +
      `*Time:* _${new Date().toISOString()}_`
    );
  });
};

await startServer();

export default app;

