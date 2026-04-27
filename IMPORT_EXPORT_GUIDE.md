# Excel Import/Export User Documentation

## Overview
This document explains how to use the Excel import and export functionality for user management.

## Features

### Export Users to Excel
Export all users from the database to an Excel file (.xlsx format).

**Endpoint:** 
```
GET /api/users/export/excel
```

**Authentication:** Required (Bearer Token)

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}
```

**Response:**
- Downloads an Excel file with all users
- Filename format: `users_export_YYYY-MM-DD.xlsx`
- Columns included: ID, Name, Email, Created At, Updated At

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api/users/export/excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o users_export.xlsx
```

---

### Import Users from Excel
Import users from an Excel file to the database.

**Endpoint:**
```
POST /api/users/import/excel
```

**Authentication:** Required (Bearer Token)

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN
```

**Request Body:**
- Form data with file field named `file`
- File must be in Excel format (.xlsx or .xls)
- Maximum file size: 5MB

**Excel File Format:**
Your Excel file should have the following columns:
| Name   | Email          | Password       |
|--------|----------------|----------------|
| John   | john@test.com  | (optional)     |
| Jane   | jane@test.com  | (optional)     |

**Required Columns:**
- `Name` - User's full name (string, required)
- `Email` - User's email address (string, required, must be valid email format)
- `Password` - User's password (string, optional - a random password will be generated if not provided)

**Response:**
```json
{
  "message": "Import completed",
  "created": 2,
  "failed": 0,
  "data": [
    {
      "id": 1,
      "name": "John",
      "email": "john@test.com",
      "createdAt": "2024-04-27T10:30:00.000Z",
      "updatedAt": "2024-04-27T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**

1. **No file uploaded:**
```json
{
  "message": "No file uploaded"
}
```

2. **Invalid file format:**
```json
{
  "message": "File must be an Excel file (.xlsx)"
}
```

3. **Validation errors:**
```json
{
  "message": "Validation failed",
  "errors": [
    "Row 2: Name and Email are required fields",
    "Row 3: Invalid email format"
  ]
}
```

4. **Duplicate users:**
```json
{
  "message": "Some users already exist",
  "duplicates": ["john@test.com"]
}
```

5. **Partial import success:**
```json
{
  "message": "Import completed",
  "created": 1,
  "failed": 1,
  "data": [
    {
      "id": 1,
      "name": "John",
      "email": "john@test.com"
    }
  ],
  "errors": [
    {
      "row": 3,
      "email": "invalid-email",
      "error": "Validation error message"
    }
  ]
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/users/import/excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@users.xlsx"
```

---

## Usage Examples

### Using Postman

#### Export Users:
1. Method: GET
2. URL: `http://localhost:3000/api/users/export/excel`
3. Headers:
   - Authorization: Bearer {token}
4. Click Send
5. File will be downloaded automatically

#### Import Users:
1. Method: POST
2. URL: `http://localhost:3000/api/users/import/excel`
3. Headers:
   - Authorization: Bearer {token}
4. Body:
   - Select "form-data"
   - Key: "file", Type: File
   - Choose your Excel file
5. Click Send

### Using JavaScript/Fetch

**Export:**
```javascript
const response = await fetch('http://localhost:3000/api/users/export/excel', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'users_export.xlsx';
a.click();
```

**Import:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/users/import/excel', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

---

## Validation Rules

- **Name:** Required, must be a string
- **Email:** Required, must be a valid email format
- **Password:** Optional, automatically hashed if provided
- **Duplicate Check:** Email addresses must be unique in the database
- **File Size:** Maximum 5MB

---

## Installation

Make sure the required dependencies are installed:

```bash
npm install
```

The following packages are required:
- `xlsx` - For Excel file handling
- `multer` - For file uploads

---

## Notes

- Passwords are automatically hashed using bcryptjs before storage
- If no password is provided during import, a random one will be generated
- Exported files do not include password hashes (for security)
- Files are automatically cleaned up after download/import
- The `uploads` directory is created automatically if it doesn't exist
- All import/export operations require authentication
