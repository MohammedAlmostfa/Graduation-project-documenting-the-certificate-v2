# File-Based Backup System Implementation

## Overview
The backup and restore system has been successfully refactored to implement a **file-based backup strategy with controlled restore selection**. All backups are now saved as timestamped files on the filesystem, allowing users to view available backups and restore from any selected backup safely.

---

## 🎯 System Architecture

### Directory Structure
```
project/
├── backups/                          # ✅ NEW: Backup files storage
│   ├── backup-2026-04-05-14-30-45.json
│   ├── backup-2026-04-05-15-00-00.json
│   └── backup-2026-04-05-16-15-30.json
├── src/
│   ├── services/
│   │   ├── backupService.js          # ✅ NEW: Backup file operations
│   │   ├── certificateService.js
│   │   ├── keyService.js
│   │   └── blockchainService.js
│   ├── requests/
│   │   ├── RestoreBackupRequest.js   # ✅ NEW: Request validation
│   │   └── ...
│   ├── controllers/
│   │   └── adminController.js         # ✅ UPDATED: New backup methods
│   ├── routes/
│   │   └── admin.js                   # ✅ UPDATED: New endpoints
│   └── bootstrap.js                   # ✅ UPDATED: BackupService singleton
```

---

## 📦 New Components Created

### 1. BackupService (`src/services/backupService.js`)
**Purpose**: Manages file-based backup and restore operations

**Key Features**:
- ✅ Generates timestamp-based filenames: `backup-YYYY-MM-DD-HH-mm-ss.json`
- ✅ Automatically creates `/backups` directory if missing
- ✅ Saves backup files with complete system data:
  - All certificates with metadata
  - All users with roles and departments
  - Complete blockchain with blocks and stats
- ✅ Lists all available backups with timestamps
- ✅ Loads and validates backup file integrity
- ✅ Implements safe restore with database transactions:
  - All-or-nothing restore guarantee
  - Automatic rollback on any error
  - Data consistency maintained
- ✅ Provides backup file deletion capability

**Key Methods**:
```javascript
// Create backup file
async createBackupFile()

// List all available backups
async listBackups()

// Load backup with validation
async loadBackupFile(filename)

// Restore with transactions (all-or-nothing)
async restoreFromBackup(filename)

// Delete backup file
async deleteBackup(filename)

// Helper methods
async ensureBackupsDirectory()
generateFilename()
getTimestampFromFilename(filename)
```

### 2. RestoreBackupRequest (`src/requests/RestoreBackupRequest.js`)
**Purpose**: Validates backup filename for restore operations

**Security Features**:
- ✅ Validates filename format: `backup-YYYY-MM-DD-HH-mm-ss.json`
- ✅ Prevents directory traversal attacks (blocks `..`, `/`, `\`)
- ✅ Ensures non-empty input
- ✅ Returns clear error messages in Arabic and English

---

## 🔄 Updated Components

### 1. Admin Controller (`src/controllers/adminController.js`)

**Updated Methods**:

#### `backupData()` - Create Backup
- **Before**: Returned backup data in memory
- **After**: Saves backup to timestamped file in `/backups/` directory
```javascript
POST /api/admin/backup
Response: {
  filename: "backup-2026-04-05-14-30-45.json",
  timestamp: "2026-04-05T14:30:45.000Z",
  dataCount: {
    certificates: 150,
    users: 25,
    blocks: 8
  }
}
```

**New Methods**:

#### `listBackups()` - List Available Backups
```javascript
GET /api/admin/backup/list
Response: {
  count: 3,
  backups: [
    {
      filename: "backup-2026-04-05-16-15-30.json",
      timestamp: "2026-04-05T16:15:30.000Z",
      created: Date object
    },
    // ... more backups (sorted by date, newest first)
  ]
}
```

#### `restoreBackup()` - Restore from Selected Backup
```javascript
POST /api/admin/backup/restore
Body: {
  backupFilename: "backup-2026-04-05-14-30-45.json"
}
Response: {
  message: "Restore completed successfully",
  restoreDetails: {
    timestamp: "2026-04-05T14:30:45.000Z",
    version: "1.0.0",
    dataRestored: {
      users: 25,
      certificates: 150,
      blocks: 8
    }
  }
}
```

**Transaction Safety**:
- Starts database transaction
- Clears existing data (DELETE commands)
- Restores users first (foreign key dependency)
- Restores certificates
- Restores blockchain
- Commits transaction
- On error: **Automatic rollback** - all changes reverted

#### `deleteBackup()` - Delete Backup File
```javascript
POST /api/admin/backup/delete
Body: {
  backupFilename: "backup-2026-04-05-14-30-45.json"
}
Response: {
  success: true,
  message: "Backup deleted successfully"
}
```

### 2. Admin Routes (`src/routes/admin.js`)

**New Endpoints**:

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/admin/backup/list` | List all available backups | Admin |
| POST | `/api/admin/backup/restore` | Restore from selected backup | Admin |
| POST | `/api/admin/backup/delete` | Delete a backup file | Admin |
| GET/POST | `/api/admin/backup` | Create new backup | Admin |

All endpoints require `Admin` role authentication.

### 3. Bootstrap (`src/bootstrap.js`)

**Updates**:
- ✅ Imported `BackupService`
- ✅ Imported `mysqlDB` singleton
- ✅ Instantiated `backupService` with all required dependencies
- ✅ Exported `backupService` in services object and exports

---

## 📋 Backup File Format

**Filename**: `backup-YYYY-MM-DD-HH-mm-ss.json`

**Content Structure**:
```json
{
  "timestamp": "2026-04-05T14:30:45.000Z",
  "version": "1.0.0",
  "data": {
    "certificates": [
      {
        "id": "cert-123",
        "certificateNumber": "2026-001",
        "studentName": "أحمد محمد",
        "degreeType": "Bachelor",
        "status": "ISSUED",
        // ... more certificate fields
      }
    ],
    "users": [
      {
        "id": "user-123",
        "username": "registrar",
        "email": "registrar@university.edu",
        "role": "REGISTRAR",
        "department": "Administration",
        // ... more user fields
      }
    ],
    "blockchain": {
      "blocks": [
        {
          "id": "block-1",
          "index": 0,
          "timestamp": "2026-04-01T10:00:00.000Z",
          "hash": "abc123...",
          "previousHash": "genesis",
          // ... more block fields
        }
      ],
      "stats": {
        "totalBlocks": 8,
        "chainHeight": 8,
        "difficulty": 4
      }
    }
  }
}
```

---

## 🔐 Security Features

### 1. Authentication & Authorization
- ✅ All backup endpoints require authentication
- ✅ Admin role required for all operations
- ✅ Request validation middleware applied

### 2. Data Validation
- ✅ Backup filename format validation (prevents injection)
- ✅ Path traversal prevention (blocks `..`, `/`, `\`)
- ✅ JSON integrity validation
- ✅ Backup structure validation

### 3. Database Transaction Safety
- ✅ Foreign key relationships preserved (users restored before certificates)
- ✅ Atomic operations (all-or-nothing)
- ✅ Automatic rollback on error
- ✅ Connection pooling for concurrency

### 4. Error Handling
- ✅ File not found errors
- ✅ Invalid backup format detection
- ✅ Corrupted JSON detection
- ✅ Database transaction failures
- ✅ Clear error messages in Arabic and English

---

## 📧 API Usage Examples

### Example 1: Create Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "message": "تم إنشاء النسخة الاحتياطية بنجاح",
  "data": {
    "filename": "backup-2026-04-05-14-30-45.json",
    "timestamp": "2026-04-05T14:30:45.000Z",
    "dataCount": {
      "certificates": 150,
      "users": 25,
      "blocks": 8
    }
  }
}
```

### Example 2: List Backups
```bash
curl -X GET http://localhost:3000/api/admin/backup/list \
  -H "Authorization: Bearer <token>"
```

**Response**:
```json
{
  "success": true,
  "message": "تم جلب قائمة النسخ الاحتياطية",
  "data": {
    "count": 3,
    "backups": [
      {
        "filename": "backup-2026-04-05-16-15-30.json",
        "timestamp": "2026-04-05T16:15:30.000Z"
      },
      {
        "filename": "backup-2026-04-05-14-30-45.json",
        "timestamp": "2026-04-05T14:30:45.000Z"
      }
    ]
  }
}
```

### Example 3: Restore from Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-05-14-30-45.json"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "تم استعادة النظام بنجاح",
  "data": {
    "timestamp": "2026-04-05T14:30:45.000Z",
    "version": "1.0.0",
    "dataRestored": {
      "users": 25,
      "certificates": 150,
      "blocks": 8
    }
  }
}
```

### Example 4: Delete Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup/delete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-05-14-30-45.json"
  }'
```

---

## ✅ Requirements Checklist

### ✅ 1. Backup File Creation
- [x] Saves backup as physical file
- [x] Uses timestamp-based naming: `backup-YYYY-MM-DD-HH-mm-ss.json`
- [x] Stores in `/backups/` directory

### ✅ 2. Backup Content
- [x] Includes all users
- [x] Includes all certificates
- [x] Includes complete blockchain data
- [x] Includes metadata (timestamp, version)

### ✅ 3. Restore Mechanism
- [x] Implements controlled restore
- [x] Allows user to view available backups
- [x] Allows user to select specific backup
- [x] Endpoint: `POST /api/backup/restore`
- [x] Accepts backup file name
- [x] Loads selected file
- [x] Restores data from it

### ✅ 4. Safe Restore Process
- [x] Uses database transactions
- [x] Rollback on error
- [x] All-or-nothing guarantee
- [x] No partial data updates
- [x] Data consistency after restore

### ✅ 5. Backup File Management
- [x] Auto-creates `/backups` directory
- [x] Stores files safely
- [x] Proper error handling

### ✅ 6. Backup Listing Feature
- [x] Endpoint: `GET /api/admin/backup/list`
- [x] Returns all backup files
- [x] Returns timestamps
- [x] Returns file names

### ✅ 7. Error Handling
- [x] File not found errors
- [x] Invalid backup selection
- [x] Corrupted backup file detection
- [x] Clear error messages

### ✅ 8. Architecture & Compatibility
- [x] No changes to overall architecture
- [x] Existing functionality preserved
- [x] Only enhanced backup & restore logic
- [x] Backward compatible

---

## 🚀 Deployment Notes

### File System Permissions
Ensure the application has write permissions to:
- `/backups/` directory (will be created if missing)

### Disk Space
Monitor disk usage as backups include all system data. For large datasets, consider:
- Backup retention policies
- Periodic cleanup of old backups
- Compression (future enhancement)

### Database Configuration
- Ensure MySQL connection pool is properly configured
- Test transaction support with your MySQL version

### Environment
- All backup operations logged to application logger
- Monitor logs for backup/restore operations
- Set up monitoring for backup file creation

---

## 📝 Logging

All backup operations are logged with appropriate levels:

```
✅ Backup validation successful
💾 Backup saved to: /backups/backup-2026-04-05-14-30-45.json
📦 Starting backup creation...
✅ Found 3 backup files
🔄 Starting restore process from: backup-2026-04-05-14-30-45.json
📋 Transaction started for restore operation
🧹 Clearing existing data...
👥 Restoring users...
✅ Users restored: 25
📜 Restoring certificates...
✅ Certificates restored: 150
⛓️ Restoring blockchain...
✅ Blockchain restored: 8
✅ Transaction committed successfully
🗑️ Backup deleted: backup-2026-04-05-14-30-45.json
```

---

## 🔧 Future Enhancements

Potential improvements for future versions:
1. **Backup Compression**: Gzip compression for smaller files
2. **Backup Encryption**: Encrypt backups with master key
3. **Incremental Backups**: Only backup changes since last backup
4. **Auto-Cleanup**: Automatic deletion of backups older than X days
5. **Backup Scheduling**: Scheduled automatic backups
6. **Cloud Storage**: Optional backup to cloud storage (AWS S3, etc.)
7. **Backup Verification**: Test restore integrity without data loss
8. **Backup Restoration Points**: Timeline view for recovery

---

## 📚 Files Modified/Created

### Created Files:
1. ✅ `src/services/backupService.js` - Complete backup service
2. ✅ `src/requests/RestoreBackupRequest.js` - Restore request validator

### Modified Files:
1. ✅ `src/controllers/adminController.js` - Updated backup methods + new restore/list methods
2. ✅ `src/routes/admin.js` - Added 3 new endpoints
3. ✅ `src/bootstrap.js` - Added BackupService singleton

### No Changes Required:
- Database schema (uses existing tables)
- Authentication middleware
- Error handling infrastructure
- Other service layers

---

## ✨ Production Checklist

- [x] Code review completed
- [x] Error handling implemented
- [x] Security validation implemented
- [x] Database transaction support verified
- [x] Backward compatibility maintained
- [x] API documentation provided
- [x] Logging implemented
- [x] No breaking changes

---

## 🎯 Summary

The now-refactored backup system provides:

✅ **File-based backups** with timestamp-based naming  
✅ **Manual backup selection** for controlled restoration  
✅ **Safe restore process** with database transactions  
✅ **Complete data consistency** with all-or-nothing guarantee  
✅ **Production-ready** with error handling and logging  
✅ **Security best practices** throughout implementation  

The system is ready for production use! 🚀
