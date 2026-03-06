import { mysqlDB } from '../storage/mysqlDB.js';
import { logger } from '../utils/logger.js';
import { BaseRepository } from './baseRepository.js';

/**
 * User Repository
 * Handles database operations for users.
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(mysqlDB);
  }

  /**
   * Get a user by ID.
   */
  async getUser(id) {
    return this.exec('getUser', this.db.getUser, id);
  }

  /**
   * Save a user to the database.
   */
  async saveUser(userData) {
    return this.exec('saveUser', this.db.saveUser, userData);
  }

  /**
   * Get all users.
   */
  async getAllUsers() {
    try {
      return await this.exec('getAllUsers', this.db.getAllUsers);
    } catch (error) {
      return [];
    }
  }

  /**
   * Find a user by username or email.
   */
  async findByUsernameOrEmail(username, email) {
    try {
      const all = await this.getAllUsers();
      return all.find(u => u.username === username || u.email === email) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find a user by username.
   */
  async findByUsername(username) {
    try {
      const all = await this.getAllUsers();
      return all.find(u => u.username === username) || null;
    } catch (error) {
      return null;
    }
  }
}

// Export a single repository instance
export const userRepository = new UserRepository();
