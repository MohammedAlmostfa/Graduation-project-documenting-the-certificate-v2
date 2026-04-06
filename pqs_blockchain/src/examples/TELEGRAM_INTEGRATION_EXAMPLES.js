/**
 * Example Integration: Using Telegram Service in Controllers
 *
 * This file demonstrates how to integrate the Telegram notification service
 * into your Express controllers for alerts, notifications, and error handling.
 *
 * Usage patterns:
 * 1. Success notifications on important operations
 * 2. Error notifications on failures
 * 3. Warning notifications for unusual activity
 * 4. Structured notifications for certificates
 */

import { telegramService } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

// ============================================================================
// Example 1: Basic Success Notification (Certificate Creation)
// ============================================================================

export const createCertificateWithNotification = asyncWrapper(async (req, res) => {
  try {
    const { studentName, certificateNumber, department } = req.body;

    // Validate input
    if (!studentName || !certificateNumber || !department) {
      return res.status(400).json(
        ApiResponse.error('الحقول المطلوبة مفقودة', 'VALIDATION_ERROR')
      );
    }

    // TODO: Create certificate in database
    // const certificate = await certificateService.create({...});

    // Send success notification
    await telegramService.success(
      `*New Certificate Created*\n\n` +
      `*Student:* ${studentName}\n` +
      `*Certificate #:* \`${certificateNumber}\`\n` +
      `*Department:* ${department}`
    );

    res.status(201).json(ApiResponse.success('تم إنشاء الشهادة', {
      studentName,
      certificateNumber,
      department
    }));

  } catch (error) {
    // Send error notification with context
    await telegramService.error(
      `Failed to create certificate for ${req.body.studentName}`,
      error
    );
    throw error;
  }
});

// ============================================================================
// Example 2: Verification Process with Status Updates
// ============================================================================

export const verifyCertificateWithNotification = asyncWrapper(async (req, res) => {
  try {
    const { certificateId } = req.params;

    // TODO: Verify certificate logic
    // const verification = await certificateService.verify(certificateId);

    // Send info notification during process
    await telegramService.info(
      `*Certificate Verification Started*\n\n` +
      `*Certificate ID:* \`${certificateId}\`\n` +
      `*Time:* _${new Date().toISOString()}_`
    );

    // Simulate verification
    const isValid = true; // Replace with actual verification

    if (!isValid) {
      // Send warning if something is suspicious
      await telegramService.warning(
        `*Certificate Verification Issue*\n\n` +
        `*Certificate ID:* \`${certificateId}\`\n` +
        `*Status:* Invalid signature detected`
      );

      return res.status(400).json(
        ApiResponse.error('فشل التحقق من الشهادة')
      );
    }

    // Send success notification
    await telegramService.success(
      `*Certificate Verified Successfully*\n\n` +
      `*Certificate ID:* \`${certificateId}\`\n` +
      `*Status:* Valid`
    );

    res.json(ApiResponse.success('تم التحقق من الشهادة', { isValid }));

  } catch (error) {
    await telegramService.error(
      `Certificate verification error for ${req.params.certificateId}`,
      error
    );
    throw error;
  }
});

// ============================================================================
// Example 3: Batch Operation with Progress Notifications
// ============================================================================

export const batchValidateCertificatesWithNotification = asyncWrapper(async (req, res) => {
  try {
    const { certificateIds } = req.body;

    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json(
        ApiResponse.error('معرفات الشهادات غير صحيحة', 'VALIDATION_ERROR')
      );
    }

    const total = certificateIds.length;

    // Send start notification
    await telegramService.info(
      `*Batch Validation Started*\n\n` +
      `*Total Certificates:* ${total}`
    );

    let validCount = 0;
    let invalidCount = 0;

    // Process certificates
    for (let i = 0; i < certificateIds.length; i++) {
      const certId = certificateIds[i];

      try {
        // TODO: validate certificate
        // const result = await certificateService.validate(certId);
        validCount++;

        // Send progress every 10 certificates
        if ((i + 1) % 10 === 0 || i === certificateIds.length - 1) {
          await telegramService.info(
            `*Batch Validation Progress*\n\n` +
            `*Processed:* ${i + 1}/${total}\n` +
            `*Valid:* ${validCount}\n` +
            `*Invalid:* ${invalidCount}`
          );
        }
      } catch (err) {
        invalidCount++;
        logger.error(`Failed to validate certificate: ${certId}`, err);
      }
    }

    // Send completion notification
    await telegramService.success(
      `*Batch Validation Completed*\n\n` +
      `*Total:* ${total}\n` +
      `*Valid:* ${validCount}\n` +
      `*Invalid:* ${invalidCount}\n` +
      `*Success Rate:* ${((validCount / total) * 100).toFixed(2)}%`
    );

    res.json(ApiResponse.success('اكتمل التحقق الجماعي', {
      total,
      validCount,
      invalidCount,
      successRate: ((validCount / total) * 100).toFixed(2)
    }));

  } catch (error) {
    await telegramService.error(
      `Batch validation process failed`,
      error
    );
    throw error;
  }
});

// ============================================================================
// Example 4: Database Backup with Notification
// ============================================================================

export const backupDatabaseWithNotification = asyncWrapper(async (req, res) => {
  try {
    // Send start notification
    await telegramService.info('*Database Backup Started*');

    // TODO: Execute backup
    // const backupResult = await backupService.backup();

    const backupResult = {
      fileName: 'backup-2026-04-05-16-00-00.json',
      timestamp: new Date().toISOString(),
      status: 'completed',
      recordsBackedUp: 5234
    };

    // Send success notification with backup details
    await telegramService.success(
      `*Database Backup Completed*\n\n` +
      `*File:* \`${backupResult.fileName}\`\n` +
      `*Records:* ${backupResult.recordsBackedUp}\n` +
      `*Status:* ✅ Success`
    );

    res.json(ApiResponse.success('اكتمل نسخ قاعدة البيانات احتياطياً', backupResult));

  } catch (error) {
    await telegramService.error(
      `Database backup failed`,
      error
    );
    throw error;
  }
});

// ============================================================================
// Example 5: Enhanced Error Handling with Context
// ============================================================================

export const complexOperationWithDetailedErrorHandling = asyncWrapper(async (req, res) => {
  const operationId = `op-${Date.now()}`;

  try {
    // Send operation start
    await telegramService.info(
      `*Operation Started*\n\n` +
      `*ID:* \`${operationId}\`\n` +
      `*User:* ${req.user?.email || 'Unknown'}`
    );

    // TODO: Complex operation logic
    // const result = await complexService.execute();

    await telegramService.success(
      `*Operation Completed Successfully*\n\n` +
      `*ID:* \`${operationId}\`\n` +
      `*Duration:* 2.5s`
    );

    res.json(ApiResponse.success('اكتملت العملية', { operationId }));

  } catch (error) {
    // Send detailed error notification
    await telegramService.error(
      `*Operation Failed*\n\n` +
      `*ID:* \`${operationId}\`\n` +
      `*User:* ${req.user?.email || 'Unknown'}\n` +
      `*Message:* ${error.message}`,
      error
    );

    throw error;
  }
});

// ============================================================================
// Example 6: Admin Action Logging
// ============================================================================

export const adminActionWithNotification = asyncWrapper(async (req, res) => {
  try {
    const { action, targetUserId, details } = req.body;

    // Send notification to admins
    await telegramService.info(
      `*Admin Action*\n\n` +
      `*Action:* \`${action}\`\n` +
      `*Target User:* \`${targetUserId}\`\n` +
      `*Admin:* ${req.user?.email || 'System'}\n` +
      `*Details:* ${details || 'N/A'}`
    );

    res.json(ApiResponse.success('تم تسجيل الإجراء'));

  } catch (error) {
    await telegramService.error('Admin action logging failed', error);
    throw error;
  }
});

// ============================================================================
// Example 7: Using Telegram Service Utility Methods
// ============================================================================

/**
 * Send structured certificate notification
 */
export const sendCertificateNotificationExample = asyncWrapper(async (req, res) => {
  const certificateData = {
    certificateNumber: 'CERT-2026-00001',
    studentName: 'Ahmed Mohammed',
    status: 'verified',
    createdAt: new Date().toISOString()
  };

  // Use the specialized certificate notification method
  await telegramService.sendCertificateNotification(
    'Certificate Created',
    certificateData
  );

  res.json(ApiResponse.success('تم إرسال إخطار الشهادة'));
});

/**
 * Check if Telegram service is ready before sending
 */
export const conditionalNotificationExample = asyncWrapper(async (req, res) => {
  const isReady = telegramService.isReady();

  if (isReady) {
    await telegramService.success('Telegram notifications are active ✅');
  } else {
    logger.warn('Telegram service is not configured');
  }

  res.json(ApiResponse.success('حالة Telegram', { isReady }));
});

// ============================================================================
// Middleware Example: Request Logging with Telegram
// ============================================================================

/**
 * Middleware to send critical API errors to Telegram
 */
export const telegramErrorNotificationMiddleware = async (err, req, res, next) => {
  // Only notify for critical errors (5xx)
  if (err.statusCode >= 500) {
    await telegramService.error(
      `*Critical API Error*\n\n` +
      `*Endpoint:* \`${req.method} ${req.path}\`\n` +
      `*Status:* ${err.statusCode}\n` +
      `*IP:* \`${req.ip}\`\n` +
      `*Message:* ${err.message}`,
      err
    );
  }

  // Continue with next middleware
  next(err);
};

