import * as mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';
import { CertificateQueries } from './queries/CertificateQueries.js';
import { KeyQueries } from './queries/KeyQueries.js';
import { ChainQueries } from './queries/ChainQueries.js';
import { UserQueries } from './queries/UserQueries.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

export class MySQLDB {
  async getCertificateByNumber(certificateNumber) {
    return this._execute(conn => CertificateQueries.getCertificateByNumber(conn, certificateNumber));
  }
  constructor(config = {}) {
    this.config = {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: 'Z', // Treat all timestamps as UTC
      ...config
    };

    this.pool = null;
    this.ready = this.init(); // Promise to ensure pool is ready
  }

  /** Initialize MySQL connection pool and ensure tables exist. */
  async init() {
    try {
      this.pool = mysql.createPool(this.config);
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();

      logger.info(`Connected to MySQL: ${this.config.host}:${this.config.port}/${this.config.database}`);
      // Table creation disabled. Remove or call createTables() manually if needed.
    } catch (err) {
      logger.error('MySQL connection/init error: ' + err.message);
      throw err;
    }
  }

  // Table creation logic removed. If you need to create tables, implement or call createTables() manually.

  /** Safe wrapper to execute queries with automatic connection handling and retries. */
  async _execute(fn) {
    if (this.ready) await this.ready;

    let conn;
    try {
      conn = await this.pool.getConnection();
      return await fn(conn);
    } catch (err) {
      if (['PROTOCOL_CONNECTION_LOST','ECONNRESET','ETIMEDOUT'].includes(err.code)) {
        logger.warn('MySQL connection lost, retrying once...');
        try { conn && conn.destroy(); } catch (_) {}
        conn = await this.pool.getConnection();
        return await fn(conn);
      }
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }

  // ==================== Certificates ====================
  async saveCertificate(certificate) {
    return this._execute(conn => CertificateQueries.saveCertificate(conn, certificate));
  }

  async getCertificate(id) {
    return this._execute(conn => CertificateQueries.getCertificateById(conn, id));
  }

  async getCertificatesByStudentId(studentId) {
    return this._execute(conn => CertificateQueries.getCertificatesByStudentId(conn, studentId));
  }

  async getAllCertificates() {
    return this._execute(conn => CertificateQueries.getAllCertificates(conn));
  }

  async getCertificatesByStatus(status) {
    return this._execute(conn => CertificateQueries.getCertificatesByStatus(conn, status));
  }

  // ==================== Keys ====================
  async saveKey(userId, type, keyData) {
    return this._execute(conn => KeyQueries.saveKey(conn, userId, type, keyData));
  }

  async getKey(userId, type) {
    return this._execute(conn => KeyQueries.getKey(conn, userId, type));
  }

  // ==================== Blockchain ====================
  async saveChain(chainData) {
    return this._execute(conn => ChainQueries.saveChain(conn, chainData));
  }

  async getChain() {
    return this._execute(conn => ChainQueries.getChain(conn));
  }

  async insertBlock(block, certificatesHash) {
    return this._execute(conn => ChainQueries.insertBlock(conn, block, certificatesHash));
  }

  async minePendingCertificatesAtomic(block, certificates, certificatesHash, certificateRepo, blockIndex) {
    return this._execute(conn => ChainQueries.minePendingCertificatesAtomic(conn, block, certificates, certificatesHash, certificateRepo, blockIndex));
  }

  async getBlockByIndex(index) {
    return this._execute(conn => ChainQueries.getBlockByIndex(conn, index));
  }

  async getBlockById(id) {
    return this._execute(conn => ChainQueries.getBlockById(conn, id));
  }

  async getAllBlocks() {
    return this._execute(conn => ChainQueries.getAllBlocks(conn));
  }

  // ==================== Users ====================
  async saveUser(user) {
    return this._execute(conn => UserQueries.saveUser(conn, user));
  }

  async getUser(userId) {
    return this._execute(conn => UserQueries.getUserById(conn, userId));
  }

  async getAllUsers() {
    return this._execute(conn => UserQueries.getAllUsers(conn));
  }

  // ==================== Utilities ====================
  async query(sql, params) {
    return this._execute(conn => conn.query(sql, params));
  }

  /** Close MySQL pool. */
  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('MySQL pool closed');
    }
  }
}

// ==================== Lazy Singleton ====================
let _instance;
export const mysqlDB = new Proxy({}, {
  get(_target, prop) {
    if (!_instance) _instance = new MySQLDB();
    return _instance[prop];
  }
});
