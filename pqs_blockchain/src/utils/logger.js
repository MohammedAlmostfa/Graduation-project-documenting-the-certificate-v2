import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import 'winston-daily-rotate-file';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure logs directory exists (application logs stored in /storage/logs)
const logsDir = path.join(__dirname, '../../storage/logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch (e) {
  // Ignore errors if directory already exists
}

const { combine, timestamp, printf, colorize, errors, splat } = winston.format;

/**
 * Console log format
 * Includes timestamp, log level, message, stack trace (if any), and metadata.
 */
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const base = `${timestamp} ${level}: ${message}`;
  if (stack) return `${base}\n${stack}`;
  const metaKeys = Object.keys(meta || {}).length ? ` ${JSON.stringify(meta)}` : '';
  return `${base}${metaKeys}`;
});

/**
 * File log format
 * Similar to console format but optimized for log files.
 */
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (stack) return `${base}\n${stack}`;
  const metaKeys = Object.keys(meta || {}).length ? ` ${JSON.stringify(meta)}` : '';
  return `${base}${metaKeys}`;
});

/**
 * Console transport
 * Logs to console with colorized output and detailed formatting.
 */
const transportConsole = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(colorize(), timestamp(), errors({ stack: true }), splat(), consoleFormat)
});

/**
 * File transport with daily rotation
 * Logs to file with rotation based on date, size, and retention policy.
 */
const DailyRotateFile = winston.transports.DailyRotateFile;
const transportFile = new DailyRotateFile({
  level: process.env.LOG_LEVEL_FILE || 'info',
  filename: path.join(logsDir, 'university-certificates-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(timestamp(), errors({ stack: true }), splat(), fileFormat)
});

/**
 * Winston logger instance
 * Combines console and file transports.
 */
const winLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [transportConsole, transportFile],
  exitOnError: false
});

/**
 * Backwards-compatible logger API
 * Provides simplified methods for logging at different levels.
 */
export const logger = {
  /**
   * Info-level logging
   */
  info(message, data = null) {
    winLogger.info(message, data || {});
  },

  /**
   * Error-level logging
   * Supports Error objects with stack traces.
   */
  error(message, error = null) {
    if (error && error instanceof Error) {
      winLogger.error(message, { message: error.message, stack: error.stack });
    } else {
      winLogger.error(message, error || {});
    }
  },

  /**
   * Warning-level logging
   */
  warn(message, data = null) {
    winLogger.warn(message, data || {});
  },

  /**
   * Success logging (mapped to info with a SUCCESS tag)
   */
  success(message, data = null) {
    winLogger.info(`SUCCESS: ${message}`, data || {});
  },

  /**
   * Debug-level logging
   */
  debug(message, data = null) {
    winLogger.debug(message, data || {});
  }
};

export default logger;

