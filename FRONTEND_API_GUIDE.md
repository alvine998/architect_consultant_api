# Frontend API Integration Guide

This guide is for client/frontend apps that use the Architect Consultant API.

## Base URL

Use the deployed API URL in production. For local development:

```txt
http://localhost:4000
```

All API routes are prefixed with `/api`.

## Authentication

Protected endpoints require a JWT token in the `Authorization` header:

```txt
Authorization: Bearer YOUR_TOKEN
```

Store the token securely on the client side. For browser apps, prefer secure cookie/session storage when available. If using local storage, treat it as sensitive.

## Shared Fetch Helper

```js
const API_BASE_URL = "http://localhost:4000";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
```

## Auth Flow

### Request OTP and Find/Create User

This endpoint finds an existing user by email or creates a new one, then sends an OTP.

```http
POST /api/auth/send-otp
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789"
}
```

Success response:

```json
{
  "message": "OTP sent to email",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08123456789",
    "chat_limit": 10
  },
  "userCreated": true
}
```

Cooldown response:

```http
429 Too Many Requests
```

```json
{
  "message": "Please wait 42 seconds before requesting another OTP",
  "retryAfter": 42
}
```

After a successful OTP request, wait 60 seconds before allowing the user to request another OTP for the same email.

Frontend example:

```js
await apiRequest("/api/auth/send-otp", {
  method: "POST",
  body: JSON.stringify({
    name,
    email,
    phone,
  }),
});
```

Frontend cooldown handling:

```js
try {
  await apiRequest("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ name, email, phone }),
  });
} catch (error) {
  if (error.status === 429) {
    startOtpCountdown(error.data?.retryAfter || 60);
  }
}
```

### Verify OTP

```http
POST /api/auth/verify-otp
```

Request:

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

Success response:

```json
{
  "message": "OTP verified successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "08123456789",
    "chat_limit": 10,
    "createdAt": "2026-05-26T07:00:00.000Z",
    "updatedAt": "2026-05-26T07:00:00.000Z"
  },
  "token": "JWT_TOKEN"
}
```

After verifying OTP, save `token` for protected API requests.

Frontend example:

```js
const data = await apiRequest("/api/auth/verify-otp", {
  method: "POST",
  body: JSON.stringify({ email, code }),
});

localStorage.setItem("token", data.token);
```

Error response:

```json
{
  "message": "Invalid or expired OTP code"
}
```

### Register Legacy User

```http
POST /api/auth/register
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

Success response:

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "JWT_TOKEN"
}
```

For the current frontend flow, prefer OTP verification because it returns the user token without password login.

### Login Legacy User

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response:

```json
{
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

Frontend example:

```js
const data = await apiRequest("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

localStorage.setItem("token", data.token);
```

## AI Chat

```http
POST /api/ai/chat
```

Requires authentication.

Request:

```json
{
  "message": "Give me three minimalist house concepts",
  "max_output_tokens": 800
}
```

Optional fields:

```json
{
  "system": "You are an architecture assistant.",
  "temperature": 0.7,
  "max_output_tokens": 800,
  "model": "glm-5.1"
}
```

For conversation history, send `messages` instead of `message`:

```json
{
  "messages": [
    { "role": "user", "content": "Suggest a tropical villa concept" },
    { "role": "assistant", "content": "A tropical modern villa..." },
    { "role": "user", "content": "Make it cheaper to build" }
  ]
}
```

The API also accepts a raw message array if your chat client already stores history in OpenAI-style format:

```json
[
  { "role": "assistant", "content": "What do you want to build?" },
  { "role": "user", "content": "I want to build house full granite" }
]
```

Topic validation uses the latest user message first. Obvious architecture-related requests such as house, renovation, layout, materials, granite, budget, or construction are allowed locally before the AI topic classifier is called.

Success response:

```json
{
  "message": "Here are three concepts...",
  "assistant": {
    "role": "assistant",
    "content": "Here are three concepts..."
  },
  "tokens": {
    "input_tokens": 120,
    "output_tokens": 300,
    "total_tokens": 420
  },
  "max_output_tokens": 800,
  "topic": {
    "allowed": true,
    "topic": "building design",
    "reason": "The request asks for house design concepts.",
    "allowed_topics": [
      "architecture",
      "architectural consultation",
      "building design"
    ]
  },
  "quota": {
    "date": "2026-05-26",
    "limit": 10,
    "used": 1,
    "remaining": 9,
    "image_limit": 1,
    "image_used": 0,
    "image_remaining": 1
  }
}
```

Frontend example:

```js
const data = await apiRequest("/api/ai/chat", {
  method: "POST",
  body: JSON.stringify({
    message: prompt,
    max_output_tokens: 800,
  }),
});

console.log(data.message);
console.log(data.quota.remaining);
```

Blocked topic response:

```http
403 Forbidden
```

```json
{
  "message": "This chat is outside the allowed topic for this assistant.",
  "topic": {
    "allowed": false,
    "topic": "sports",
    "reason": "The request is about football and is unrelated to architecture consultation.",
    "allowed_topics": [
      "architecture",
      "architectural consultation",
      "building design"
    ]
  }
}
```

The topic classifier runs before daily quota is consumed. Off-topic requests do not reduce `quota.remaining`.

## AI Image Generation

```http
POST /api/ai/images
```

Requires authentication.

Request:

```json
{
  "prompt": "Modern tropical house exterior, realistic render",
  "size": "1280x1280"
}
```

Optional fields:

```json
{
  "model": "glm-image",
  "quality": "hd",
  "watermark_enabled": true
}
```

Success response:

```json
{
  "images": [
    "https://example.com/generated-image.png"
  ],
  "data": [
    {
      "url": "https://example.com/generated-image.png"
    }
  ],
  "quota": {
    "date": "2026-05-26",
    "limit": 10,
    "used": 2,
    "remaining": 8,
    "image_limit": 1,
    "image_used": 1,
    "image_remaining": 0
  }
}
```

Frontend example:

```js
const data = await apiRequest("/api/ai/images", {
  method: "POST",
  body: JSON.stringify({
    prompt,
    size: "1280x1280",
  }),
});

const imageUrl = data.images[0];
```

## AI Quota Rules

AI quota is counted per authenticated user, per IP address, per Jakarta date.

- Default total quota: 10 AI requests per day
- The total limit uses the user's `chat_limit` value
- Chat consumes 1 request
- Image generation consumes 1 request
- Image generation is limited to 1 request per day

When quota is exceeded, API returns:

```http
429 Too Many Requests
```

Example error:

```json
{
  "message": "Daily AI request limit reached. Maximum 10 requests per user per IP per day.",
  "quota": {
    "date": "2026-05-26",
    "limit": 10,
    "used": 10,
    "remaining": 0,
    "image_limit": 1,
    "image_used": 1,
    "image_remaining": 0
  }
}
```

Frontend handling:

```js
try {
  await apiRequest("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message: prompt }),
  });
} catch (error) {
  if (error.status === 429) {
    alert(error.data?.message || "Daily AI quota reached");
  }
}
```

## Users API

All user endpoints require authentication.

### List Users

```http
GET /api/users?page=1&limit=10&search=john
```

Success response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "08123456789",
      "chat_limit": 10,
      "createdAt": "2026-05-26T07:00:00.000Z",
      "updatedAt": "2026-05-26T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get User Detail

```http
GET /api/users/:id
```

Success response:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "chat_limit": 10,
  "createdAt": "2026-05-26T07:00:00.000Z",
  "updatedAt": "2026-05-26T07:00:00.000Z"
}
```

Error response:

```json
{
  "message": "User not found"
}
```

### Create User

```http
POST /api/users
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": null,
  "chat_limit": 10,
  "createdAt": "2026-05-26T07:00:00.000Z",
  "updatedAt": "2026-05-26T07:00:00.000Z"
}
```

Duplicate email response:

```json
{
  "message": "Email already in use"
}
```

### Update User

```http
PUT /api/users/:id
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

Success response:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "chat_limit": 10,
  "createdAt": "2026-05-26T07:00:00.000Z",
  "updatedAt": "2026-05-26T07:05:00.000Z"
}
```

### Delete User

```http
DELETE /api/users/:id
```

Success response:

```http
204 No Content
```

## Admin API

Admin auth uses a separate admin token. Protected admin endpoints require an admin JWT token:

```txt
Authorization: Bearer ADMIN_TOKEN
```

### Register Admin

```http
POST /api/admins/register
```

Request:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

Success response:

```json
{
  "admin": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "login_attempts": 0,
    "createdAt": "2026-05-26T07:00:00.000Z",
    "updatedAt": "2026-05-26T07:00:00.000Z"
  },
  "token": "ADMIN_JWT_TOKEN"
}
```

### Login Admin

```http
POST /api/admins/login
```

Request:

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Success response:

```json
{
  "admin": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "login_attempts": 0,
    "createdAt": "2026-05-26T07:00:00.000Z",
    "updatedAt": "2026-05-26T07:00:00.000Z"
  },
  "token": "ADMIN_JWT_TOKEN"
}
```

### List Admins

```http
GET /api/admins?page=1&limit=10&search=admin
```

Success response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "login_attempts": 0,
      "createdAt": "2026-05-26T07:00:00.000Z",
      "updatedAt": "2026-05-26T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get Admin Detail

```http
GET /api/admins/:id
```

### Create Admin

```http
POST /api/admins
```

Request:

```json
{
  "name": "Second Admin",
  "email": "second-admin@example.com",
  "password": "secret123"
}
```

### Update Admin

```http
PUT /api/admins/:id
```

Request:

```json
{
  "name": "Updated Admin",
  "email": "admin@example.com",
  "password": "new-secret123"
}
```

### Delete Admin

```http
DELETE /api/admins/:id
```

Success response:

```http
204 No Content
```

## User Attempts API

These endpoints are for reading or creating OTP/user attempt logs. They require authentication.

### List Attempts

```http
GET /api/user-attempts?page=1&limit=10&email=john@example.com&success=true
```

Success response:

```json
{
  "data": [
    {
      "id": 1,
      "email": "john@example.com",
      "ipaddress": "::1",
      "timestamp": "2026-05-26T07:00:00.000Z",
      "success": true,
      "createdAt": "2026-05-26T07:00:00.000Z",
      "updatedAt": "2026-05-26T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get Attempt Detail

```http
GET /api/user-attempts/:id
```

Success response:

```json
{
  "id": 1,
  "email": "john@example.com",
  "ipaddress": "::1",
  "timestamp": "2026-05-26T07:00:00.000Z",
  "success": true,
  "createdAt": "2026-05-26T07:00:00.000Z",
  "updatedAt": "2026-05-26T07:00:00.000Z"
}
```

Error response:

```json
{
  "message": "User attempt not found"
}
```

### Create Attempt Manually

```http
POST /api/user-attempts
```

Request:

```json
{
  "email": "john@example.com",
  "success": false
}
```

Success response:

```json
{
  "id": 2,
  "email": "john@example.com",
  "ipaddress": "::1",
  "timestamp": "2026-05-26T07:10:00.000Z",
  "success": false,
  "updatedAt": "2026-05-26T07:10:00.000Z",
  "createdAt": "2026-05-26T07:10:00.000Z"
}
```

## Common Error Responses

Validation error:

```json
{
  "message": "Email is required"
}
```

Invalid token:

```json
{
  "message": "Invalid token"
}
```

No token:

```json
{
  "message": "No token provided"
}
```

## Client Checklist

- Save token after login/register
- Attach `Authorization: Bearer TOKEN` for protected endpoints
- Handle `401` by redirecting to login
- Handle `403` by clearing invalid token
- Handle `429` by showing AI quota message
- Read `quota.remaining` after AI responses to update the UI
- Disable image generation button when `quota.image_remaining` is `0`
