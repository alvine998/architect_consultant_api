# Postman Collection Setup Guide

## Overview
This guide explains how to import and use the Postman collection for testing the User Management API with Excel import/export functionality.

## File
**File:** `User_Management_API.postman_collection.json`

## Setup Instructions

### Step 1: Import Collection into Postman

1. Open Postman
2. Click **Import** button (top-left area)
3. Select **Upload Files**
4. Navigate to and select `User_Management_API.postman_collection.json`
5. Click **Import**

The collection will now appear in your Postman workspace with all endpoints organized.

### Step 2: Create Environment (Optional but Recommended)

1. Click **Environments** on the left sidebar
2. Click **Create New Environment**
3. Name it `User API Local` or similar
4. Add these variables:
   - Key: `base_url`, Value: `http://localhost:3000`
   - Key: `auth_token`, Value: `` (leave empty, will be filled automatically)
5. Click **Save**
6. Select this environment from the dropdown in the top-right

### Step 3: Authenticate

1. Navigate to **Authentication** → **Login** in the collection
2. Update the email and password if needed (defaults to `admin@example.com` / `password123`)
3. Click **Send**
4. On successful login, the token will automatically be saved to the `auth_token` variable

## Collection Structure

### 📁 Authentication
- **Login** - POST `/api/auth/login`
  - Returns authentication token
  - Automatically saves token to environment

### 📁 User CRUD Operations
- **Get All Users** - GET `/api/users`
  - Query params: page, limit, search
- **Get User by ID** - GET `/api/users/:id`
- **Create User** - POST `/api/users`
- **Update User** - PUT `/api/users/:id`
- **Delete User** - DELETE `/api/users/:id`

### 📁 Excel Import/Export
- **Download Template** - GET `/api/users/import/template`
  - Downloads sample Excel template
- **Export Users to Excel** - GET `/api/users/export/excel`
  - Exports all users to Excel file
- **Import Users from Excel** - POST `/api/users/import/excel`
  - Upload Excel file to import users

## Usage Examples

### Testing Export/Import Flow

1. **Step 1: Authenticate**
   - Go to Authentication → Login
   - Click Send
   - Token automatically saved

2. **Step 2: Download Template**
   - Go to Excel Import/Export → Download Template
   - Click Send
   - Excel file will download

3. **Step 3: Edit Template**
   - Open the downloaded template
   - Add users with Name, Email, and optionally Password columns
   - Save file

4. **Step 4: Import Users**
   - Go to Excel Import/Export → Import Users from Excel
   - In Body section, click on the file field
   - Select your edited Excel file
   - Click Send
   - Response will show created/failed counts

5. **Step 5: Export Users**
   - Go to Excel Import/Export → Export Users to Excel
   - Click Send
   - Excel file with all users will download

### Testing CRUD Operations

**Create User:**
```
POST /api/users
Body:
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "password": "password123"
}
```

**Get All Users:**
```
GET /api/users?page=1&limit=10
```

**Update User:**
```
PUT /api/users/1
Body:
{
  "name": "Updated Name",
  "email": "new.email@example.com",
  "password": "newPassword"
}
```

**Delete User:**
```
DELETE /api/users/1
```

## Variables Reference

The collection uses the following variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `base_url` | http://localhost:3000 | API base URL |
| `auth_token` | (auto-filled) | Authentication token from login |

To change the base URL:
1. Click the environment dropdown (top-right)
2. Click the eye icon to edit
3. Update the `base_url` value

## Tips & Tricks

### 1. Auto-Authentication
- The Login endpoint automatically saves the token
- All other endpoints use `Bearer {{auth_token}}` header
- You only need to login once per session

### 2. Excel File Format
Column names are case-sensitive:
- `Name` (required)
- `Email` (required)
- `Password` (optional)

### 3. Testing Import with Errors
To test error handling, try importing:
- **Duplicate emails** - will show already exist error
- **Invalid email format** - validation error
- **Missing Name field** - validation error

### 4. Pre-request Scripts
The collection includes pre-request scripts that:
- Automatically set `base_url` if not already set
- Ensure environment variables are initialized

### 5. Test Scripts
The Login endpoint includes a test script that:
- Checks if response is successful
- Extracts and saves the token automatically
- Logs token to console

## Response Examples

### Successful Import
```json
{
  "message": "Import completed",
  "created": 2,
  "failed": 0,
  "data": [
    {
      "id": 5,
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-04-27T10:30:00.000Z",
      "updatedAt": "2024-04-27T10:30:00.000Z"
    }
  ]
}
```

### Import with Errors
```json
{
  "message": "Some users already exist",
  "duplicates": ["existing@example.com"]
}
```

### Validation Error
```json
{
  "message": "Validation failed",
  "errors": [
    "Row 2: Invalid email format",
    "Row 3: Name is required"
  ]
}
```

## Troubleshooting

### Issue: "No file uploaded" error
- Make sure you select a file in the Import endpoint
- Check that file is in .xlsx format

### Issue: "Auth token not found" error
- Run the Login endpoint first
- Check that you have an environment selected
- Verify the token variable is being set

### Issue: "Server connection failed"
- Make sure the Express server is running on port 3000
- Check the base_url in environment variables
- Verify your API is accessible

### Issue: "Duplicate emails" error when importing
- Check if users already exist in database
- Try importing with different email addresses
- Or modify the import endpoint to handle duplicates differently

## Advanced Usage

### Using Postman Runner
1. Go to Collection menu
2. Click "Run Collection"
3. Select endpoints to run in sequence
4. Configure delays between requests if needed
5. Click "Run"

### Using Pre-request Scripts
Edit the Collection settings to add global pre-request scripts:
```javascript
// Auto-set timestamp
pm.environment.set('timestamp', new Date().toISOString());

// Log request details
console.log('Making request to: ' + pm.request.url);
```

### Using Test Scripts
Add test scripts to validate responses:
```javascript
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has token", function() {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('token');
});
```

## Export Collection
To export this collection for sharing:
1. Right-click the collection name
2. Select **Export**
3. Choose **Collection v2.1**
4. Select location to save

## Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [API Guide](./IMPORT_EXPORT_GUIDE.md)
- [Quick Reference](./API_QUICK_REFERENCE.md)
