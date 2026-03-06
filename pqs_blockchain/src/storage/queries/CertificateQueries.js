import { logger } from '../../utils/logger.js';
import { firstNonNull, toFloatSafe, hasValue, isArray, isEmptyArray } from '../../utils/validators.js';
import { normalizeStatus, formatDateIfPresent, formatDateTimeIfPresent } from './shared.js';

const CERT_SELECT_BASE = `
	SELECT c.*,
		s.id        AS student_id,
		s.name      AS student_name,
		s.department AS student_department,
		s.email     AS student_email,
		s.date_of_birth AS date_of_birth,
		s.nationality AS nationality,
		s.father_name AS father_name,
		s.mother_name AS mother_name,
		s.major     AS major,
		s.faculty   AS faculty,
		b.block_index AS block_number,
		b.id          AS block_id
	FROM certificates c
	JOIN students s ON c.student_id = s.id
	LEFT JOIN blockchain b ON c.block_id = b.id
`;

export class CertificateQueries {
	static async _upsertStudent(conn, student = {}) {
		if (!student.id) {
			const { v4: uuidv4 } = await import('uuid');
			student.id = student.studentId || uuidv4();
		}
		const sql = `
			INSERT INTO students (
					id, name, department, email, date_of_birth, nationality,
					father_name, mother_name, major, faculty
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					name = VALUES(name),
					department = VALUES(department),
					email = VALUES(email),
					date_of_birth = VALUES(date_of_birth),
					nationality = VALUES(nationality),
					father_name = VALUES(father_name),
					mother_name = VALUES(mother_name),
					major = VALUES(major),
					faculty = VALUES(faculty)
		`;
		await conn.query(sql, [
			student.id,
			firstNonNull(student.name, student.studentName),
			student.department || null,
			firstNonNull(student.email, student.studentEmail),
			student.dateOfBirth || null,
			student.nationality || null,
			student.fatherName || null,
			student.motherName || null,
			student.major || null,
			student.faculty || null
		]);
		return student.id;
	}

	static async _upsertCertificate(conn, cert, studentId) {
		cert.status = normalizeStatus(cert.status);
		const columns = [
			'id','certificate_number','student_id','issue_date','certificate_type','status',
			'graduation_date','graduation_cycle','gpa','honors',
			'certificate_hash','transaction_hash','block_id','created_at','updated_at'
		];
		const placeholders = columns.map(() => '?');
		const params = [cert.id, cert.certificateNumber, studentId];
		params.push(
			cert.issueDate,
			cert.student.certificateType,
			cert.status,
			cert.student.graduationDate || null,
			cert.student.graduationCycle || null,
			toFloatSafe(cert.student.gpa),
			cert.student.honors || null,
			cert.certificateHash,
			cert.transactionHash,
			cert.blockId || null,
			cert.createdAt,
			cert.updatedAt
		);
		const updateClauses = [
			'certificate_number = VALUES(certificate_number)',
			'student_id = VALUES(student_id)',
			'issue_date = VALUES(issue_date)',
			'certificate_type = VALUES(certificate_type)',
			'status = VALUES(status)',
			'certificate_hash = VALUES(certificate_hash)',
			'transaction_hash = VALUES(transaction_hash)',
			'block_id = VALUES(block_id)',
			'updated_at = VALUES(updated_at)'
		];
		const sql = `INSERT INTO certificates (${columns.join(',')})
			VALUES (${placeholders.join(',')})
			ON DUPLICATE KEY UPDATE ${updateClauses.join(',')}
		`;
		await conn.query(sql, params);
	}

	static async _replaceSignatures(conn, certificateId, signatures) {
		if (!isArray(signatures)) return;
		if (isEmptyArray(signatures)) {
			await conn.query('DELETE FROM certificate_signatures WHERE certificate_id = ?', [certificateId]);
			return;
		}
		const rows = signatures.map(sig => [
			certificateId,
			sig.signerId || null,
			sig.signature
		]);
		await conn.query('DELETE FROM certificate_signatures WHERE certificate_id = ?', [certificateId]);
		const insertSql = 'INSERT INTO certificate_signatures (certificate_id, signer_id, signature) VALUES ?';
		await conn.query(insertSql, [rows]);
	}

	static _rowToCertificate(row) {
		const cert = {
			id: row.id,
			certificateNumber: row.certificate_number,
			student: {
				studentId: row.student_id,
				id: row.student_id,
				studentName: row.student_name,
				name: row.student_name,
				department: row.student_department,
				studentEmail: row.student_email,
				email: row.student_email,
				dateOfBirth: formatDateIfPresent(row.date_of_birth),
				nationality: row.nationality,
				fatherName: row.father_name,
				motherName: row.mother_name,
				major: row.major,
				faculty: row.faculty,
				graduationDate: formatDateIfPresent(row.graduation_date),
				graduationCycle: row.graduation_cycle,
				gpa: toFloatSafe(row.gpa),
				honors: row.honors,
				certificateType: row.certificate_type
			},
			issueDate: formatDateTimeIfPresent(row.issue_date),
			certificateType: row.certificate_type,
			status: normalizeStatus(row.status),
			certificateHash: row.certificate_hash,
			transactionHash: row.transaction_hash,
			blockId: row.block_id,
			blockIndex: row.block_number,
			blockNumber: row.block_number,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			signatures: []
		};
		Object.keys(cert.student).forEach(k => {
			if (!hasValue(cert.student[k])) delete cert.student[k];
		});
		return cert;
	}

	static async _attachSignatures(conn, certs) {
		if (isEmptyArray(certs)) return certs;
		const ids = certs.map(c => c.id);
		const [sigRows] = await conn.query(
			'SELECT certificate_id, signer_id, signature FROM certificate_signatures WHERE certificate_id IN (?)',
			[ids]
		);
		const map = {};
		for (const r of sigRows) {
			const arr = map[r.certificate_id] || (map[r.certificate_id] = []);
			arr.push({
				signerId: r.signer_id,
				signature: r.signature
			});
		}
		return certs.map(c => ({ ...c, signatures: map[c.id] || [] }));
	}

	static async saveCertificate(conn, certificate) {
		await conn.beginTransaction();
		try {
			const studentId = await this._upsertStudent(conn, certificate.student || {});
			await this._upsertCertificate(conn, certificate, studentId);
			await this._replaceSignatures(conn, certificate.id, certificate.signatures);
			await conn.commit();
			logger.debug(`💾 Saved certificate: ${certificate.id} - ${certificate.certificateNumber}`);
			return true;
		} catch (err) {
			await conn.rollback();
			throw err;
		}
	}

	static async getCertificateById(conn, certificateId) {
		const [[row]] = await conn.query(`${CERT_SELECT_BASE} WHERE c.id = ?`, [certificateId]);
		if (!row) return null;
		const [sigs] = await conn.query(
			'SELECT signer_id, signature FROM certificate_signatures WHERE certificate_id = ?',
			[certificateId]
		);
		const cert = this._rowToCertificate(row);
		cert.signatures = sigs.map(r => ({
			signerId: r.signer_id,
			signature: r.signature
		}));
		return cert;
	}

	static async getCertificatesByStudentId(conn, studentId) {
		const [rows] = await conn.query(`${CERT_SELECT_BASE} WHERE c.student_id = ?`, [studentId]);
		const certs = rows.map(this._rowToCertificate.bind(this));
		return this._attachSignatures(conn, certs);
	}

	static async getAllCertificates(conn) {
		const [rows] = await conn.query(`${CERT_SELECT_BASE} ORDER BY c.created_at DESC`);
		const certs = rows.map(this._rowToCertificate.bind(this));
		return this._attachSignatures(conn, certs);
	}

	static async getCertificatesByStatus(conn, status) {
		const norm = normalizeStatus(status);
		const [rows] = await conn.query(`${CERT_SELECT_BASE} WHERE c.status = ? ORDER BY c.created_at DESC`, [norm]);
		const certs = rows.map(this._rowToCertificate.bind(this));
		return this._attachSignatures(conn, certs);
	}
}
