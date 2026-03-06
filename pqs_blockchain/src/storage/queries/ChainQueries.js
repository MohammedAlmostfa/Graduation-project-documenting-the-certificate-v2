import { logger } from '../../utils/logger.js';
import { certificateStatus } from '../../config/security.js';
import { serializeJSON, deserializeJSON } from './shared.js';

export class ChainQueries {
	static async saveChain(conn, chainData) {
		if (!chainData || !Array.isArray(chainData.chain)) return;
		const rows = chainData.chain.map(b => [
			b.index,
			b.timestamp,
			b.previousHash,
			b.hash,
			b.nonce,
			b.difficulty,
			serializeJSON(b.certificateIds) ?? '[]'
		]);
		const sql = `
			INSERT INTO blockchain
				(block_index, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids)
			VALUES ?
			ON DUPLICATE KEY UPDATE
				timestamp = VALUES(timestamp),
				previous_hash = VALUES(previous_hash),
				hash = VALUES(hash),
				nonce = VALUES(nonce),
				difficulty = VALUES(difficulty),
				certificate_ids = VALUES(certificate_ids)
		`;
		if (rows.length) await conn.query(sql, [rows]);
		logger.debug('💾 Saved blockchain chain (relational)');
		return true;
	}

	static async getChain(conn) {
		const [rows] = await conn.query('SELECT *, certificates_hash FROM blockchain ORDER BY block_index');
		if (!rows || rows.length === 0) return null;
		const chain = rows.map(r => ({
			index: r.block_index,
			timestamp: r.timestamp,
			previousHash: r.previous_hash,
			hash: r.hash,
			nonce: r.nonce,
			difficulty: r.difficulty,
			certificateIds: deserializeJSON(r.certificate_ids),
			certificatesHash: r.certificates_hash || ''
		}));
		return { chain, pendingCertificates: [] };
	}

	static async insertBlock(conn, block, certificatesHash) {
		const sql = `
			INSERT INTO blockchain
				(block_index, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids, certificates_hash)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`;
		const params = [
			block.index,
			block.timestamp,
			block.previousHash,
			block.hash,
			block.nonce,
			block.difficulty,
			serializeJSON(block.certificateIds) ?? '[]',
			certificatesHash || ''
		];
		const result = await conn.query(sql, params);
		return result[0].insertId;
	}

	static async minePendingCertificatesAtomic(conn, block, certificates, certificatesHash, certificateRepo, blockIndex) {
		let blockId = null;
		const minedCertificates = [];
		try {
			await conn.beginTransaction();
			const certificateIds = certificates.map(c => c.id || c.certificateId);
			if (certificateIds.length === 0) {
				await conn.rollback();
				throw new Error('No certificates to mine');
			}
			const placeholders = certificateIds.map(() => '?').join(',');
			const [lockedCerts] = await conn.query(
				`SELECT id, certificate_hash FROM certificates
				 WHERE id IN (${placeholders}) AND status = ?
				 FOR UPDATE`,
				[...certificateIds, certificateStatus.BLOCKCHAIN_ADDED]
			);
			if (!lockedCerts || lockedCerts.length === 0) {
				await conn.rollback();
				throw new Error('No certificates found with BLOCKCHAIN_ADDED status or concurrent modification detected');
			}
			const insertBlockSql = `
				INSERT INTO blockchain
					(block_index, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids, certificates_hash)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`;
			const insertBlockParams = [
				block.index,
				block.timestamp,
				block.previousHash,
				block.hash,
				block.nonce,
				block.difficulty,
				serializeJSON(block.certificateIds) ?? '[]',
				certificatesHash || ''
			];
			const insertResult = await conn.query(insertBlockSql, insertBlockParams);
			blockId = insertResult[0].insertId;
			if (!blockId) {
				await conn.rollback();
				throw new Error('Failed to get blockId after insert');
			}
			for (const cert of certificates) {
				const certId = cert.id || cert.certificateId;
				const [[certRow]] = await conn.query(
					`SELECT certificate_hash FROM certificates WHERE id = ?`,
					[certId]
				);
				if (!certRow) {
					await conn.rollback();
					throw new Error(`Certificate ${certId} not found for update`);
				}
				const blockHash = block.hash;
				const oqsCrypto = await import('../../utils/crypto-oqs.js').then(m => m.oqsCrypto);
				const transactionHash = oqsCrypto.hashData(
					(certRow.certificate_hash || '') + '|' + blockHash + '|' + blockIndex.toString()
				);
				const updateSql = `
					UPDATE certificates
					SET status = ?, block_id = ?, transaction_hash = ?, updated_at = NOW()
					WHERE id = ?
				`;
				await conn.query(updateSql, [
					certificateStatus.COMPLETED,
					blockId,
					transactionHash,
					certId
				]);
				minedCertificates.push({
					id: certId,
					blockId: blockId,
					blockIndex: blockIndex,
					transactionHash: transactionHash
				});
			}
			await conn.commit();
			return { blockId, blockIndex, minedCertificates };
		} catch (error) {
			try { await conn.rollback(); } catch (rollbackErr) { logger.error(`❌ Rollback error: ${rollbackErr.message}`); }
			throw error;
		}
	}

	static async getBlockByIndex(conn, index) {
		const [rows] = await conn.query('SELECT * FROM blockchain WHERE block_index = ? LIMIT 1', [index]);
		if (!rows || rows.length === 0) return null;
		const r = rows[0];
		return {
			id: r.id,
			index: r.block_index,
			timestamp: r.timestamp,
			previousHash: r.previous_hash,
			hash: r.hash,
			nonce: r.nonce,
			difficulty: r.difficulty,
			certificateIds: deserializeJSON(r.certificate_ids)
		};
	}

	static async getBlockById(conn, id) {
		const [rows] = await conn.query('SELECT * FROM blockchain WHERE id = ? LIMIT 1', [id]);
		if (!rows || rows.length === 0) return null;
		const r = rows[0];
		return {
			id: r.id,
			index: r.block_index,
			timestamp: r.timestamp,
			previousHash: r.previous_hash,
			hash: r.hash,
			nonce: r.nonce,
			difficulty: r.difficulty,
			certificateIds: deserializeJSON(r.certificate_ids)
		};
	}

	static async getAllBlocks(conn) {
		const [rows] = await conn.query('SELECT * FROM blockchain ORDER BY block_index');
		return rows.map(r => ({
			id: r.id,
			index: r.block_index,
			timestamp: r.timestamp,
			previousHash: r.previous_hash,
			hash: r.hash,
			nonce: r.nonce,
			difficulty: r.difficulty,
			certificateIds: deserializeJSON(r.certificate_ids)
		}));
	}
}
