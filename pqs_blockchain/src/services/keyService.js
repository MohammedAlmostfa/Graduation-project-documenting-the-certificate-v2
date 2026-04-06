import { User } from '../models/User.js';
import { oqsCrypto } from '../utils/crypto-oqs.js';
import { userRepository } from '../repositories/userRepository.js';
import { roles } from '../config/security.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Service to manage users and their cryptographic keys.
 */
export class KeyService {
    constructor({ repo, keyManagementService } = {}) {
        this.repo = repo || userRepository;
        this.keyManagementService = keyManagementService;
        this.initDefaultUsers();
    }

    /** Initialize default users if none exist. */
    async initDefaultUsers() {
        try {
            const existingUsers = await this.getAllUsers();
            if (existingUsers.length === 0) {
                await this.createDefaultUsers();
                logger.info('Default users created');
            }
        } catch (error) {
            logger.error(`Error initializing default users: ${error.message}`);
        }
    }

    /** Create default system users. */
    async createDefaultUsers() {
        const defaultPassword = '$2y$12$FnsajJtvuWq4PmoGXzReS.mLcY00NmRm3rB3.GsBT4pnmmTLUxHgG';
        const defaultUsers = [
            { username: 'certificate_officer', email: 'officer@university.edu', password: defaultPassword, role: roles.OFFICER, department: 'HMK' },
            { username: 'faculty_dean', email: 'dean@university.edu', password: defaultPassword, role: roles.DEAN, department: 'HMK' },
            { username: 'university_president', email: 'president@university.edu', password: defaultPassword, role: roles.PRESIDENT, department: 'HMK' },
            { username: 'system_admin', email: 'admin@university.edu', password: defaultPassword, role: roles.ADMIN, department: 'HMK' }
        ];

        for (const userData of defaultUsers) {
            await this.createUser(
                userData.username,
                userData.email,
                userData.password,
                userData.role,
                userData.department
            );
        }
    }

    /** Create a new user and store keys securely. */
    async createUser(username, email, password, role, department) {
        try {
            const existingUser = await this.findUserByUsernameOrEmail(username, email);
            if (existingUser) throw new ValidationError('User already exists');

            const keyPair = await oqsCrypto.generateKeyPair();

            const user = new User({
                username,
                email,
                password, // Store password as plain text (no hashing)
                role,
                department,
                publicKey: oqsCrypto.serializePublicKey(keyPair.publicKey),
                algorithm: keyPair.algorithm
            });

            await this.repo.saveUser(user.toSafeJSON());
            await this.keyManagementService.storeKeyPair(user.id, keyPair);

            logger.info(`New user created: ${username}`);

            return {
                user: user.toSafeJSON(),
                keyPair: { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }
            };
        } catch (error) {
            logger.error(`Error creating user: ${error.message}`);
            throw error;
        }
    }

    /** Retrieve a user with their private key. */
    async getUserWithPrivateKey(userId) {
        try {
            const userData = await this.repo.getUser(userId);
            if (!userData) throw new Error('User not found');

            const privateKey = await this.keyManagementService.getPrivateKey(userId);
            const user = new User(userData);
            user.privateKey = privateKey;

            return user;
        } catch (error) {
            logger.error(`Error retrieving user with private key: ${error.message}`);
            throw error;
        }
    }

    /** Sign data using a user's private key. */
    async signDataWithUserKey(userId, data) {
        try {
            const user = await this.getUserWithPrivateKey(userId);
            if (!user.privateKey) throw new Error('Private key not available');

            try {
                const canonical = oqsCrypto._canonicalizeForSigning(data);
                const msgHash = oqsCrypto.hashData(data);
                logger.debug(`Signing: user=${user.username} canonical=${canonical}`);
                logger.debug(`Message hash: ${msgHash}`);
            } catch (dbgErr) {
                logger.debug(`Could not compute canonical/hash: ${dbgErr.message}`);
            }

            const signatureResult = await oqsCrypto.signData(data, user.privateKey);

            return {
                signature: signatureResult.signature,
                publicKey: user.publicKey,
                algorithm: user.algorithm,
                messageHash: signatureResult.messageHash
            };
        } catch (error) {
            logger.error(`Error signing data: ${error.message}`);
            throw error;
        }
    }

    /** Find a user by username or email. */
    async findUserByUsernameOrEmail(username, email) {
        try {
            const allUsers = await this.getAllUsers();
            return allUsers.find(user => user.username === username || user.email === email);
        } catch {
            return null;
        }
    }

    /** Get a user by ID. */
    async getUser(userId) {
        try {
            const userData = await this.repo.getUser(userId);
            if (!userData) throw new NotFoundError('User not found');
            return new User(userData);
        } catch (error) {
            logger.error(`Error retrieving user: ${error.message}`);
            throw error;
        }
    }

    /** Get all users. */
    async getAllUsers() {
        try {
            return await this.repo.getAllUsers();
        } catch (error) {
            logger.error(`Error retrieving all users: ${error.message}`);
            return [];
        }
    }
}

