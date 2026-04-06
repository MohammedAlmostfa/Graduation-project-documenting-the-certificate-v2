import { logger } from '../../utils/logger.js';
import { certificateStatus } from '../../config/security.js';
import { serializeJSON, deserializeJSON } from './shared.js';
import { oqsCrypto } from '../../utils/crypto-oqs.js';

export class ChainQueries {
	static async saveChain(conn, chainData) {
		if (!chainData || !Array.isArray(chainData.chain)) return;

		// Validate all hashes before saving
		const invalidBlocks = [];
		const rows = chainData.chain.map(b => {
			const validation = oqsCrypto.validateBlockHashes(b);
			if (!validation.valid) {
				invalidBlocks.push({
					id: b.id,
					errors: validation.errors
				});
			}
			return [
				b.id,
				b.timestamp,
				b.previousHash,
				b.hash,
				b.nonce,
				b.difficulty,
				serializeJSON(b.certificateIds) ?? '[]',
				b.merkleRoot || ''
			];
		});

		// Report corruption but allow save (user decision on recovery)
		if (invalidBlocks.length > 0) {
			logger.warn(`⚠️  Detected ${invalidBlocks.length} blocks with corrupted hashes:`);
			invalidBlocks.forEach(block => {
				logger.warn(`   Block ${block.id}:`);
				block.errors.forEach(err => logger.warn(`      - ${err}`));
			});
		}

		const sql = `
			INSERT INTO blockchain
				(id, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids, merkle_root)
			VALUES ?
			ON DUPLICATE KEY UPDATE
				timestamp = VALUES(timestamp),
				previous_hash = VALUES(previous_hash),
				hash = VALUES(hash),
				nonce = VALUES(nonce),
				difficulty = VALUES(difficulty),
				certificate_ids = VALUES(certificate_ids),
				merkle_root = VALUES(merkle_root)
		`;
		if (rows.length) await conn.query(sql, [rows]);
		logger.debug('💾 Saved blockchain chain');
		return true;
	}

	static async getChain(conn) {
		const [rows] = await conn.query('SELECT * FROM blockchain ORDER BY id');
		if (!rows || rows.length === 0) return null;

		// CRITICAL: Convert types from database strings to correct types
		// Database returns everything as string, must convert to numbers for hashing
		const chain = rows.map(r => ({
			id: Number(r.id),                       // string -> number (represents block index)
			timestamp: r.timestamp,
			previousHash: String(r.previous_hash),   // ensure string
			hash: r.hash,
			nonce: Number(r.nonce),                  // string -> number
			difficulty: Number(r.difficulty),        // string -> number
			certificateIds: deserializeJSON(r.certificate_ids),
			merkleRoot: String(r.merkle_root || '')  // ensure string
		}));

		// Validate loaded hashes for corruption
		const corruptedBlocks = [];
		chain.forEach(block => {
			const validation = oqsCrypto.validateBlockHashes(block);
			if (!validation.valid) {
				corruptedBlocks.push({
					id: block.id,
					errors: validation.errors
				});
			}
		});

		if (corruptedBlocks.length > 0) {
			logger.warn(`⚠️  Found ${corruptedBlocks.length} corrupted blocks during load:`);
			corruptedBlocks.forEach(block => {
				logger.warn(`   Block ${block.id}:`);
				block.errors.forEach(err => logger.warn(`      - ${err}`));
			});
		}

		return { chain, pendingCertificates: [] };
	}

	static async insertBlock(conn, block, merkleRoot) {
		if (!merkleRoot || merkleRoot === '') {
			throw new Error('Invalid Merkle Root: cannot be null or empty');
		}

		// Validate block hashes before insertion
		const validation = oqsCrypto.validateBlockHashes(block);
		if (!validation.valid) {
			logger.warn(`⚠️  Block ${block.id} contains corrupted hash fields:`);
			validation.errors.forEach(err => logger.warn(`   - ${err}`));
			throw new Error(`Cannot insert block ${block.id} with corrupted hashes: ${validation.errors.join('; ')}`);
		}

		const sql = `
			INSERT INTO blockchain
				(id, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids, merkle_root)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`;
		const params = [
			block.id,
			block.timestamp,
			block.previousHash,
			block.hash,
			block.nonce,
			block.difficulty,
			serializeJSON(block.certificateIds) ?? '[]',
			merkleRoot
		];
		const result = await conn.query(sql, params);
		return result[0].insertId;
	}

	/**
	 * CRITICAL: Get last block from DB WITHOUT locking
	 * Used in blockchainService to determine block id and previousHash
	 * This is separate from getLastBlockWithLock which is used during atomic mining
	 *
	 * Returns:
	 * - For non-genesis blocks: {id, hash, previousHash}
	 * - For genesis (no blocks): {id: -1, hash: '0', previousHash: '0'}
	 */
	static async getLastBlockFromDB(conn) {
		try {
			const [rows] = await conn.query(`
				SELECT id, hash, previous_hash, nonce, difficulty, timestamp, merkle_root
				FROM blockchain
				ORDER BY id DESC
				LIMIT 1
			`);

			if (!rows || rows.length === 0) {
				// No blocks yet, return genesis reference
				logger.debug(`📍 No blocks in DB - Genesis block will be created next (id=0)`);
				return {
					id: -1,
					hash: '0',
					previousHash: '0',
					nonce: 0,
					difficulty: 4
				};
			}

			const lastBlock = rows[0];
			logger.debug(`📍 Last block from DB: id=${lastBlock.id}, hash=${lastBlock.hash.substring(0, 16)}...`);

			return {
				id: Number(lastBlock.id),
				hash: String(lastBlock.hash),
				previousHash: String(lastBlock.previous_hash || '0'),
				nonce: Number(lastBlock.nonce),
				difficulty: Number(lastBlock.difficulty),
				timestamp: lastBlock.timestamp,
				merkleRoot: String(lastBlock.merkle_root || ''),
				nextId: Number(lastBlock.id) + 1
			};
		} catch (error) {
			logger.error(`❌ Error getting last block from DB: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get last block info with locking to prevent race conditions
	 * Uses FOR UPDATE to ensure atomic read and prevent concurrent mining
	 * conflicts where multiple threads try to mine simultaneously
	 */
	static async getLastBlockWithLock(conn) {
		try {
			const [rows] = await conn.query(`
			SELECT id, hash, nonce, difficulty
			FROM blockchain
			ORDER BY id DESC
				FOR UPDATE
			`);

			if (!rows || rows.length === 0) {
				// No blocks yet, return genesis reference
				return {
					index: -1,
					hash: '0',
					previousHash: '0'
				};
			}

			const lastBlock = rows[0];
			return {
				id: lastBlock.id,
				hash: lastBlock.hash,
				nonce: lastBlock.nonce,
				difficulty: lastBlock.difficulty,
				nextId: lastBlock.id + 1
			};
		} catch (error) {
			logger.error(`❌ Error getting last block with lock: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Validate block index is actually next in sequence
	 * Call AFTER getting lock to prevent index collision
	 */
	static async validateBlockIdSequence(conn, expectedIndex) {
		try {
			const [rows] = await conn.query(`
			SELECT MAX(id) as maxId
			FROM blockchain
		`);

		const currentMax = rows[0]?.maxId ?? -1;
		const expectedNextId = currentMax + 1;

		if (expectedIndex !== expectedNextId) {
			throw new Error(
				`Block id collision detected: expected ${expectedNextId}, got ${expectedIndex}. ` +
				`Another thread may have mined a block. Current chain max: ${currentMax}`
			);
		}

		return { valid: true, nextId: expectedNextId };
		} catch (error) {
			if (error.message.includes('collision')) throw error;
			logger.error(`❌ Error validating block index: ${error.message}`);
			throw error;
		}
	}

	static async minePendingCertificatesAtomic(conn, block, certificates, merkleRoot, certificateRepo, blockId) {
		const minedCertificates = [];
		try {
			if (!merkleRoot || merkleRoot === '') {
				throw new Error('Invalid Merkle Root: cannot be null or empty');
			}

			// Validate block hashes before mining transaction
			const validation = oqsCrypto.validateBlockHashes(block);
			if (!validation.valid) {
				throw new Error(`Cannot mine block ${block.id} with corrupted hashes: ${validation.errors.join('; ')}`);
			}

			await conn.beginTransaction();

			// CRITICAL: Get last block with FOR UPDATE lock to prevent race conditions
			// This ensures only ONE thread can mine the next block
			const lastBlockInfo = await ChainQueries.getLastBlockWithLock(conn);
			logger.debug(`🔐 Acquired lock on blockchain for mining (last block id: ${lastBlockInfo.id})`);

			// Validate that this block id is the next sequential id
			if (blockId !== (lastBlockInfo.id + 1)) {
				await conn.rollback();
				throw new Error(
					`Race condition detected: Block id mismatch. ` +
					`Expected ${lastBlockInfo.id + 1}, got ${blockId}. ` +
					`Concurrent mining detected - retry mining`
				);
			}

			// Validate that previousHash points to the actual last block
			const expectedPreviousHash = lastBlockInfo.hash;
			if (block.previousHash !== expectedPreviousHash) {
				await conn.rollback();
				throw new Error(
					`Race condition detected: Previous hash mismatch. ` +
					`Expected ${expectedPreviousHash}, got ${block.previousHash}. ` +
					`Another thread may have mined a block - retry mining`
				);
			}

			logger.debug(`✅ Block sequence validated: id=${blockId}, previousHash=${block.previousHash}`);

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
					(id, timestamp, previous_hash, hash, nonce, difficulty, certificate_ids, merkle_root)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`;
			const insertBlockParams = [
				block.id,
				block.timestamp,
				block.previousHash,
				block.hash,
				block.nonce,
				block.difficulty,
				serializeJSON(block.certificateIds) ?? '[]',
				merkleRoot
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
					(certRow.certificate_hash || '') + '|' + blockHash + '|' + blockId.toString()
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
					blockIndex: blockId,
					transactionHash: transactionHash
				});
			}
			await conn.commit();

			const updateCertificatesSql = `
				SELECT id, status FROM certificates
				WHERE id IN (${certificateIds.map(() => '?').join(',')})
			`;
			const [updatedCerts] = await conn.query(updateCertificatesSql, certificateIds);

			return { blockId, blockIndex: blockId, minedCertificates, updatedCertificates: updatedCerts };
		} catch (error) {
			try { await conn.rollback(); } catch (rollbackErr) { logger.error(`❌ Rollback error: ${rollbackErr.message}`); }
			throw error;
		}
	}

	static async getBlockByIndex(conn, index) {
		const [rows] = await conn.query('SELECT * FROM blockchain WHERE id = ? LIMIT 1', [index]);
		if (!rows || rows.length === 0) return null;
		const r = rows[0];
		// CRITICAL: Convert types from database strings to correct types
		const block = {
			id: r.id,
			timestamp: r.timestamp,
			previousHash: String(r.previous_hash), // ensure string
			hash: r.hash,
			nonce: Number(r.nonce),               // string -> number
			difficulty: Number(r.difficulty),     // string -> number
			certificateIds: deserializeJSON(r.certificate_ids),
			merkleRoot: String(r.merkle_root || '') // ensure string
		};

		// Validate hash integrity when loading
		const validation = oqsCrypto.validateBlockHashes(block);
		if (!validation.valid) {
			logger.warn(`⚠️  Block ${index} loaded with corrupted hashes:`);
			validation.errors.forEach(err => logger.warn(`   - ${err}`));
		}

		return block;
	}

	static async getBlockById(conn, id) {
		const [rows] = await conn.query('SELECT * FROM blockchain WHERE id = ? LIMIT 1', [id]);
		if (!rows || rows.length === 0) return null;
		const r = rows[0];
		// CRITICAL: Convert types from database strings to correct types
		const block = {
			id: r.id,
			timestamp: r.timestamp,
			previousHash: String(r.previous_hash), // ensure string
			hash: r.hash,
			nonce: Number(r.nonce),               // string -> number
			difficulty: Number(r.difficulty),     // string -> number
			certificateIds: deserializeJSON(r.certificate_ids),
			merkleRoot: String(r.merkle_root || '') // ensure string
		};

		// Validate hash integrity when loading
		const validation = oqsCrypto.validateBlockHashes(block);
		if (!validation.valid) {
			logger.warn(`⚠️  Block ID ${id} loaded with corrupted hashes:`);
			validation.errors.forEach(err => logger.warn(`   - ${err}`));
		}

		return block;
	}

	static async getAllBlocks(conn) {
		const [rows] = await conn.query('SELECT * FROM blockchain ORDER BY id');
		// CRITICAL: Convert types from database strings to correct types
		const blocks = rows.map(r => ({
			id: r.id,
			timestamp: r.timestamp,
			previousHash: String(r.previous_hash), // ensure string
			hash: r.hash,
			nonce: Number(r.nonce),               // string -> number
			difficulty: Number(r.difficulty),     // string -> number
			certificateIds: deserializeJSON(r.certificate_ids),
			merkleRoot: String(r.merkle_root || '') // ensure string
		}));

		// Validate all blocks for corruption
		const corruptedCount = blocks.filter(block => {
			const validation = oqsCrypto.validateBlockHashes(block);
			if (!validation.valid) {
				logger.warn(`⚠️  Block ${block.id} has corrupted hashes:`);
				validation.errors.forEach(err => logger.warn(`   - ${err}`));
				return true;
			}
			return false;
		}).length;

		if (corruptedCount > 0) {
			logger.warn(`⚠️  Found ${corruptedCount} blocks with corruption during getAllBlocks()`);
		}

		return blocks;
	}
}

