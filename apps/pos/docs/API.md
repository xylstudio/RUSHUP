# API Documentation

## Overview

This document describes the API endpoints available in the Xylem Landscape application.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication

Most API endpoints require authentication using Supabase JWT tokens.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Authentication endpoints: 10 requests per minute per IP

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Endpoints

### Notifications

#### GET /api/notifications

Get user notifications.

**Authentication**: Required

**Query Parameters**:
- `limit` (optional): Number of notifications to return (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "order_confirmed",
      "title": "Order Confirmed",
      "message": "Your order has been confirmed",
      "read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/notifications

Create a notification.

**Authentication**: Required

**Request Body**:
```json
{
  "type": "order_confirmed",
  "title": "Order Confirmed",
  "message": "Your order has been confirmed"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "order_confirmed",
    "title": "Order Confirmed",
    "message": "Your order has been confirmed",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PATCH /api/notifications

Mark notifications as read.

**Authentication**: Required

**Request Body**:
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": 2
  }
}
```

---

### Jobs

#### GET /api/jobs

Get jobs (for staff/admin).

**Authentication**: Required (staff or admin role)

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "assigned_to": "uuid",
      "status": "assigned",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/jobs

Create a new job assignment.

**Authentication**: Required (admin role)

**Request Body**:
```json
{
  "order_id": "uuid",
  "assigned_to": "uuid",
  "notes": "Special instructions"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "assigned_to": "uuid",
    "status": "assigned",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PATCH /api/jobs/:id

Update job status.

**Authentication**: Required

**Request Body**:
```json
{
  "status": "in_progress",
  "notes": "Started working on this job"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Measurements

#### GET /api/measurements

Get measurement requests.

**Authentication**: Required

**Query Parameters**:
- `status` (optional): Filter by status
- `branch_code` (optional): Filter by branch

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "house_id": "uuid",
      "status": "pending",
      "scheduled_date": "2024-01-15",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/measurements

Create a measurement request.

**Authentication**: Required

**Request Body**:
```json
{
  "house_id": "uuid",
  "preferred_date": "2024-01-15",
  "preferred_time": "morning",
  "notes": "Please call before arriving"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## Webhooks

### Stripe Payment Webhook

#### POST /api/webhook/stripe

Receive payment status updates from Stripe for POS and workshop payments.

**Authentication**: Stripe signature verification

**Request Body**: Stripe webhook event payload

---

## Best Practices

### Security

1. Always use HTTPS in production
2. Store tokens securely (HttpOnly cookies recommended)
3. Rotate tokens regularly
4. Never expose API keys in client-side code

### Performance

1. Use pagination for list endpoints
2. Implement caching where appropriate
3. Use proper HTTP methods (GET, POST, PUT, DELETE)
4. Compress responses (gzip)

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }
  const data = await response.json()
  return data
} catch (error) {
  console.error('API Error:', error)
  // Handle error appropriately
}
```

---

## Support

For issues or questions:
- GitHub Issues: [github.com/natthan1997/xylproject/issues](https://github.com/natthan1997/xylproject/issues)
- Email: support@xylem.com
