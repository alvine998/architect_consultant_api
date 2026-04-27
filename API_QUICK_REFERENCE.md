# Excel Import/Export API Quick Reference

## Endpoints Summary

### 1. Export Users to Excel
**Export all users as an Excel file**

```bash
curl -X GET http://localhost:3000/api/users/export/excel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- **Method:** GET
- **URL:** `/api/users/export/excel`
- **Authentication:** Required
- **Response:** Downloads Excel file (users_export_YYYY-MM-DD.xlsx)

---

### 2. Import Users from Excel
**Import users from an Excel file**

```bash
curl -X POST http://localhost:3000/api/users/import/excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@users.xlsx"
```

- **Method:** POST
- **URL:** `/api/users/import/excel`
- **Authentication:** Required
- **Body:** Form data with `file` field
- **File Type:** .xlsx (max 5MB)
- **Response:** JSON with created/failed counts and user data

---

### 3. Download Template
**Download a sample Excel template for importing users**

```bash
curl -X GET http://localhost:3000/api/users/import/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o users_template.xlsx
```

- **Method:** GET
- **URL:** `/api/users/import/template`
- **Authentication:** Required
- **Response:** Downloads sample template file

---

## Excel File Format

### Export Format (users_export_YYYY-MM-DD.xlsx)
Automatically generated with columns:
- ID
- Name
- Email
- Created At
- Updated At

### Import Format Required
Your Excel file must have these columns:

| Name | Email | Password |
|------|-------|----------|
| John Doe | john@example.com | (optional) |
| Jane Smith | jane@example.com | password123 |

**Rules:**
- `Name` - Required, string
- `Email` - Required, valid email format
- `Password` - Optional (random password generated if omitted)
- Emails must be unique (no duplicates in database)

---

## Response Examples

### Successful Export
File download with filename: `users_export_2024-04-27.xlsx`

### Successful Import
```json
{
  "message": "Import completed",
  "created": 2,
  "failed": 0,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-04-27T10:30:00.000Z",
      "updatedAt": "2024-04-27T10:30:00.000Z"
    }
  ]
}
```

### Error: Duplicate Emails
```json
{
  "message": "Some users already exist",
  "duplicates": ["existing@example.com"]
}
```

### Error: Validation Failed
```json
{
  "message": "Validation failed",
  "errors": [
    "Row 2: Invalid email format",
    "Row 3: Name is required"
  ]
}
```

---

## Testing with cURL

### 1. Get Auth Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Export Users
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:3000/api/users/export/excel \
  -H "Authorization: Bearer $TOKEN" \
  -o exported_users.xlsx
```

### 3. Import Users
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:3000/api/users/import/excel \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@users_to_import.xlsx"
```

### 4. Download Template
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:3000/api/users/import/template \
  -H "Authorization: Bearer $TOKEN" \
  -o template.xlsx
```

---

## Features Implemented

✅ Export all users to Excel format  
✅ Import users from Excel file  
✅ Download import template  
✅ Automatic password hashing  
✅ Duplicate email detection  
✅ Validation for Name and Email  
✅ Automatic file cleanup after processing  
✅ Support for optional passwords  
✅ Error handling and reporting  
✅ File size limits (5MB)  
✅ Proper MIME type validation  

---

## File Structure

New files created:
- `src/utils/excel.js` - Excel handling utilities
- `src/utils/generate-template.js` - Template generation
- `IMPORT_EXPORT_GUIDE.md` - Detailed documentation
- `API_QUICK_REFERENCE.md` - This file

Modified files:
- `package.json` - Added xlsx and multer dependencies
- `src/controllers/user.controller.js` - Added export/import functions
- `src/routes/user.routes.js` - Added new routes
- `server.js` - Added uploads directory setup

---

## Dependencies Added

- **xlsx** - Excel file read/write operations
- **multer** - File upload handling

Both are automatically installed via `npm install`
