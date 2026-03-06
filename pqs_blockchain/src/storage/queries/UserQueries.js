import { logger } from '../../utils/logger.js';
import { dateOrNow, hasNoRows } from '../../utils/validators.js';
import { deserializeJSON } from './shared.js';

export class UserQueries {
	static async saveUser(conn, user) {
		const sql = `
			INSERT INTO users (id, username, email, password, role, department, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				username = VALUES(username),
				email = VALUES(email),
				password = VALUES(password),
				role = VALUES(role),
				department = VALUES(department)
		`;
		const params = [
			user.id,
			user.username,
			user.email,
			user.password,
			user.role,
			user.department,
			dateOrNow(user.createdAt)
		];
		await conn.query(sql, params);
		logger.debug(`💾 Saved user: ${user.username}`);
		return true;
	}

	static async getUserById(conn, userId) {
		const [rows] = await conn.query(
			`SELECT u.id, u.username, u.email, u.role, u.department, u.created_at,
							k.key_data AS public_key
			 FROM users u
			 LEFT JOIN \`keys\` k ON k.user_id = u.id AND k.type = 'public'
			 WHERE u.id = ? LIMIT 1`,
			[userId]
		);
		if (hasNoRows(rows)) return null;
		const row = rows[0];
		return {
			id: row.id,
			username: row.username,
			email: row.email,
			role: row.role,
			publicKey: deserializeJSON(row.public_key) || null,
			department: row.department,
			createdAt: row.created_at
		};
	}

	static async getAllUsers(conn) {
		const [rows] = await conn.query(
			`SELECT u.id, u.username, u.email, u.role, u.department, u.created_at,
							k.key_data AS public_key
			 FROM users u
			 LEFT JOIN \`keys\` k ON k.user_id = u.id AND k.type = 'public'
			 ORDER BY u.created_at DESC`
		);
		return rows.map(row => ({
			id: row.id,
			username: row.username,
			email: row.email,
			role: row.role,
			publicKey: deserializeJSON(row.public_key) || null,
			department: row.department,
			createdAt: row.created_at
		}));
	}
}
