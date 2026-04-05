import { v4 as uuidv4 } from 'uuid';

/**
 * User
 * Represents a system user with role-based permissions and cryptographic keys.
 */
export class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // Password stored as plain text (no hashing)
    this.role = data.role;
    this.department = data.department;
    this.publicKey = data.publicKey; // Public key stored as base64
    this.algorithm = data.algorithm || 'ML-DSA-65';
    this.privateKey = data.privateKey; // Private key kept only in memory
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  /**
   * Check if the user has permission for a required role.
   * Uses the role hierarchy to compare permission levels.
   */
  hasPermission(requiredRole) {
    const userLevel = User.roleHierarchy[this.role] || 0;
    const requiredLevel = User.roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Return user data without the private key.
   */
  toSafeJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      password: this.password,
      role: this.role,
      department: this.department,
      publicKey: this.publicKey,
      algorithm: this.algorithm,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive
    };
  }

  /**
   * Return full user data.
   * Includes a flag showing if a private key exists.
   */
  toJSON() {
    return {
      ...this.toSafeJSON(),
      hasPrivateKey: !!this.privateKey // Private key itself is never exposed
    };
  }

  /**
   * Role hierarchy used for permission checks.
   * Higher number = higher authority.
   */
  static roleHierarchy = {
    officer: 1,
    dean: 2,
    president: 3,
    admin: 4
  };
}
