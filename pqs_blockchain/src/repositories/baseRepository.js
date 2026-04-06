import { logger } from '../utils/logger.js';

/**
 * Base repository class.
 * Provides common database logic and error logging.
 */
export class BaseRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Execute a database operation and log errors consistently.
   * @param {string} operationName - Name of the operation
   * @param {Function} fn - Database function to execute
   * @param  {...any} args - Arguments passed to the function
   * @returns {Promise<any>} Result from the database call
   */
  async exec(operationName, fn, ...args) {
    try {
      return await fn.apply(this.db, args);
    } catch (err) {
      logger.error(`❌ Repository:${operationName} error: ${err.message}`);
      throw err;
    }
  }
}

