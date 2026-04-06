import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger.js';

/**
 * Telegram Notification Service
 *
 * A singleton service for sending notifications to Telegram.
 * - Uses Telegram Bot API (sender-only, no polling)
 * - Implements error handling to prevent app crashes
 * - Supports markdown formatting
 * - Provides multiple notification methods for different severity levels
 *
 * Usage:
 *   const telegramService = TelegramService.getInstance();
 *   await telegramService.success('Certificate created successfully');
 *   await telegramService.error('Certificate validation failed');
 */
class TelegramService {
  constructor() {
    this.bot = null;
    this.chatId = null;
    this.isEnabled = false;
    this.init();
  }

  /**
   * Initialize Telegram bot with environment variables
   */
  init() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

      if (!token || !chatId) {
        this.isEnabled = false;
        logger.warn('⚠️ Telegram service disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
        return;
      }

      // Initialize bot with sender-only configuration (no polling)
      this.bot = new TelegramBot(token);
      this.chatId = chatId;
      this.isEnabled = true;

      logger.info('✅ Telegram service initialized successfully');
    } catch (error) {
      this.isEnabled = false;
      logger.error('❌ Failed to initialize Telegram service', error);
    }
  }

  /**
   * Send a raw message to Telegram
   * @param {string} message - Plain text message
   * @returns {Promise<void>}
   */
  async send(message) {
    if (!this.isEnabled) {
      logger.debug('Telegram service is disabled, skipping message');
      return;
    }

    try {
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
      }

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      logger.debug(`📤 Telegram message sent: ${message.substring(0, 50)}...`);
    } catch (error) {
      // Log but do not throw - prevent Telegram failures from crashing the app
      logger.error('📤 Failed to send Telegram message', error);
    }
  }

  /**
   * Send a success notification
   * @param {string} message - Success message
   * @returns {Promise<void>}
   */
  async success(message) {
    const formattedMessage = `✅ *SUCCESS*\n\n${message}`;
    await this.send(formattedMessage);
  }

  /**
   * Send an error notification
   * @param {string} message - Error message
   * @param {Error|null} error - Optional error object
   * @returns {Promise<void>}
   */
  async error(message, error = null) {
    let formattedMessage = `❌ *ERROR*\n\n*Message:* ${message}`;

    if (error instanceof Error) {
      formattedMessage += `\n*Error:* ${error.message}`;
      if (process.env.NODE_ENV !== 'production') {
        // Include stack trace in development
        const stackLines = error.stack?.split('\n').slice(0, 3).join('\n');
        if (stackLines) {
          formattedMessage += `\n*Stack:*\n\`\`\`\n${stackLines}\n\`\`\``;
        }
      }
    }

    formattedMessage += `\n\n_Timestamp: ${new Date().toISOString()}_`;
    await this.send(formattedMessage);
  }

  /**
   * Send a warning notification
   * @param {string} message - Warning message
   * @returns {Promise<void>}
   */
  async warning(message) {
    const formattedMessage = `⚠️ *WARNING*\n\n${message}\n\n_Timestamp: ${new Date().toISOString()}_`;
    await this.send(formattedMessage);
  }

  /**
   * Send an info notification
   * @param {string} message - Info message
   * @returns {Promise<void>}
   */
  async info(message) {
    const formattedMessage = `ℹ️ *INFO*\n\n${message}\n\n_Timestamp: ${new Date().toISOString()}_`;
    await this.send(formattedMessage);
  }

  /**
   * Send a detailed certificate notification
   * @param {string} title - Notification title
   * @param {object} certificateData - Certificate details
   * @returns {Promise<void>}
   */
  async sendCertificateNotification(title, certificateData) {
    const message = `
*${title}*

*Certificate Number:* \`${certificateData.certificateNumber || 'N/A'}\`
*Student:* ${certificateData.studentName || 'N/A'}
*Status:* \`${certificateData.status || 'Unknown'}\`
*Date:* ${certificateData.createdAt || new Date().toISOString()}
    `.trim();

    await this.info(message);
  }

  /**
   * Check if Telegram service is enabled and ready
   * @returns {boolean}
   */
  isReady() {
    return this.isEnabled && this.bot !== null;
  }

  /**
   * Get singleton instance
   * @returns {TelegramService}
   */
  static getInstance() {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static resetInstance() {
    TelegramService.instance = null;
  }
}

// Create and export singleton instance
export const telegramService = TelegramService.getInstance();
export default TelegramService;

