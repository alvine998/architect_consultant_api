# Excel Import/Export API Quick Reference

## Docker

Build and start the API with MySQL:

```bash
docker compose up --build
```

Run in the background:

```bash
docker compose up -d --build
```

Stop services:

```bash
docker compose down
```

The compose setup maps:
- API: `http://localhost:4000`
- MySQL: `localhost:3306`
- Uploads: `./uploads`

Inside Docker, the API connects to MySQL using `DB_HOST=db`.

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

### Admin Login
```bash
curl -X POST http://localhost:3000/api/admins/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### Create Admin
```bash
curl -X POST http://localhost:3000/api/admins/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password",
    "confirmPassword": "password"
  }'
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

### 5. Chat with AI
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Give me three modern minimalist house concepts",
    "max_output_tokens": 800
  }'
```

For chat history, send `messages` instead of `message`:
```json
{
  "messages": [
    { "role": "user", "content": "Suggest a villa concept" },
    { "role": "assistant", "content": "A tropical modern villa..." },
    { "role": "user", "content": "Make it cheaper to build" }
  ]
}
```

AI usage quota:
- Each authenticated user gets 10 AI requests per day per IP address by default
- Image generation is optional and limited to 1 request per day per IP address
- Image generation counts as 1 of the 10 total daily AI requests
- The daily limit uses the user's `chat_limit` value

### 6. Generate Image with AI
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:3000/api/ai/images \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern tropical house exterior, warm lighting, realistic render",
    "size": "1280x1280"
  }'
```

Required environment variables:
```env
BIGMODEL_API_KEY=your_bigmodel_api_key_here
BIGMODEL_BASE_URL=https://open.bigmodel.cn/api/paas/v4
BIGMODEL_CHAT_MODEL=glm-5.1
BIGMODEL_IMAGE_MODEL=glm-image
BIGMODEL_MAX_OUTPUT_TOKENS=1024
BIGMODEL_TOPIC_CLASSIFIER_MODEL=glm-5.1
AI_ALLOWED_TOPICS=architecture,architectural consultation,building design,interior design,construction,renovation,materials,space planning,landscape design,cost estimation,permits,property development
```

### 7. Request OTP and Find/Create User
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08123456789"
  }'
```

This endpoint now:
- Finds an existing user by email or creates one
- Sends an OTP to the email
- Stores a `user_attempt` row with `success: true` or `success: false`
- Requires waiting 60 seconds before requesting another OTP for the same email

Cooldown response:
```json
{
  "message": "Please wait 42 seconds before requesting another OTP",
  "retryAfter": 42
}
```

Verify OTP and get user token:
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "code": "123456"
  }'
```

Verify OTP success response:
```json
{
  "message": "OTP verified successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08123456789",
    "chat_limit": 10
  },
  "token": "JWT_TOKEN"
}
```

### 8. User Attempts
```bash
TOKEN="your_token_here"
curl -X GET "http://localhost:3000/api/user-attempts?page=1&limit=10&success=true" \
  -H "Authorization: Bearer $TOKEN"
```

Create a manual attempt record:
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:3000/api/user-attempts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "success": false
  }'
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
