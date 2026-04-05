# Backup System - Quick Reference Guide

## 🚀 Quick Start

### Create a Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### List Available Backups
```bash
curl -X GET http://localhost:3000/api/admin/backup/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Restore from Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-05-14-30-45.json"
  }'
```

### Delete a Backup
```bash
curl -X POST http://localhost:3000/api/admin/backup/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-05-14-30-45.json"
  }'
```

---

## 📁 File Locations

- **Backups Directory**: `/project/backups/`
- **Service**: `src/services/backupService.js`
- **Controller**: `src/controllers/adminController.js`
- **Routes**: `src/routes/admin.js`
- **Validator**: `src/requests/RestoreBackupRequest.js`

---

## 🔐 Security

✅ All endpoints require **Admin authentication**  
✅ Filename validation prevents directory traversal  
✅ Database transactions ensure data consistency  
✅ Automatic rollback on errors  

---

## 📊 Backup Format

**Filename**: `backup-YYYY-MM-DD-HH-mm-ss.json`

**Contents**:
- All certificates
- All users
- Complete blockchain
- System metadata

**Size**: Typically 100KB - 10MB depending on data volume

---

## ⚡ Key Features

| Feature | Details |
|---------|---------|
| **Auto Directory** | `/backups/` created automatically |
| **Timestamp Names** | `backup-YYYY-MM-DD-HH-mm-ss.json` |
| **All-or-Nothing** | Complete restore or rollback |
| **Transaction Safe** | Database transactions used |
| **Validation** | JSON and structure verified |
| **Error Safe** | Automatic rollback on failure |
| **Logging** | All operations logged |

---

## 🆘 Troubleshooting

### Backup Creation Fails
- Check directory write permissions
- Verify disk space available
- Check database connection
- Review logs for specific errors

### Restore Fails
- Verify backup file exists and is valid
- Check file is not corrupted
- Ensure enough disk space
- Verify database is running
- Check for foreign key constraint violations

### File Not Found
- Use `GET /api/admin/backup/list` to see available backups
- Verify filename spelling and format
- Check backups directory exists

---

## 📋 Status Response Examples

### Success Response
```json
{
  "success": true,
  "message": "تم إنشاء النسخة الاحتياطية بنجاح",
  "data": { /* ... */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## 🎯 Common Workflows

### Daily Backup
```bash
#!/bin/bash
# Create daily backup
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### List and Select Restore
```bash
# 1. List all available backups
curl -X GET http://localhost:3000/api/admin/backup/list \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 2. Select one and restore
curl -X POST http://localhost:3000/api/admin/backup/restore \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-05-14-30-45.json"
  }'
```

### Cleanup Old Backups
```bash
# List all backups
curl -X GET http://localhost:3000/api/admin/backup/list \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Delete old backup
curl -X POST http://localhost:3000/api/admin/backup/delete \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backupFilename": "backup-2026-04-01-10-00-00.json"
  }'
```

---

## 📱 API Endpoints Summary

```
GET    /api/admin/backup/list      - List all backups
POST   /api/admin/backup           - Create backup
POST   /api/admin/backup/restore   - Restore from backup
POST   /api/admin/backup/delete    - Delete backup
```

**Authentication**: Required for all endpoints  
**Authorization**: Admin role required for all endpoints

---

## 🔄 Restore Process Flow

```
User Request
    ↓
Validate Filename
    ↓
Load Backup File
    ↓
Validate JSON & Structure
    ↓
Start Database Transaction
    ↓
Clear Existing Data
    ↓
Restore Users
    ↓
Restore Certificates
    ↓
Restore Blockchain
    ↓
Commit Transaction ✅
    ↓
(OR Rollback on Error ❌)
```

---

## 💾 Storage Considerations

- **Location**: Project root `/backups/` directory
- **Permissions**: Read/Write for application process
- **Retention**: Manual - use `/delete` endpoint to remove old backups
- **Monitoring**: Check log files for backup operations

---

## 📞 Support

For issues or questions:
1. Check application logs: `storage/logs/`
2. Verify admin authentication token
3. Ensure proper admin role
4. Test endpoint with valid backup filename
5. Review error messages for specific issues

---

## ✅ Verification Checklist

- [ ] Backups directory exists: `/backups/`
- [ ] Can list backups: `GET /api/admin/backup/list`
- [ ] Can create backup: `POST /api/admin/backup`
- [ ] Can restore backup: `POST /api/admin/backup/restore`
- [ ] Can delete backup: `POST /api/admin/backup/delete`
- [ ] Logs show all operations
- [ ] Admin authentication working
- [ ] Admin role properly assigned

---

Last Updated: April 5, 2026
