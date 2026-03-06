import { logger } from '../../utils/logger.js';
import { serializeJSON, deserializeJSON, hasNoRows } from './shared.js';

export class KeyQueries {
	static async saveKey(conn, userId, type, keyData) {
		const sql = `INSERT INTO \`keys\` (user_id, type, key_data, updated_at) VALUES (?, ?, ?, NOW())
								 ON DUPLICATE KEY UPDATE key_data = VALUES(key_data), updated_at = VALUES(updated_at)`;
		await conn.query(sql, [userId, type, serializeJSON(keyData)]);
		logger.debug(`💾 Saved key (${type}) for user: ${userId}`);
		return true;
	}

	static async getKey(conn, userId, type) {
		const [rows] = await conn.query(
			'SELECT key_data FROM \`keys\` WHERE user_id = ? AND type = ?',
			[userId, type]
		);
		if (hasNoRows(rows)) return null;
		return deserializeJSON(rows[0].key_data);
	}
}
