# API Documentation

## Base URL
```
https://api.secureface.com/api/v1
```

## Authentication
All requests require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses follow standard format:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": 1634567890000
}
```

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Endpoints

### Authentication

#### Register Device
```
POST /auth/register-device
Content-Type: application/json

{
  "deviceId": "device-uuid",
  "deviceName": "Pixel 4a",
  "osVersion": "12",
  "appVersion": "1.0.0"
}

Response:
{
  "success": true,
  "data": {
    "deviceId": "device-uuid",
    "token": "jwt-token",
    "expiresIn": 86400
  }
}
```

#### Verify Device
```
POST /auth/verify-device
Content-Type: application/json
Authorization: Bearer <token>

{
  "deviceId": "device-uuid",
  "signature": "device-signature"
}

Response:
{
  "success": true,
  "data": {
    "verified": true,
    "newToken": "jwt-token"
  }
}
```

### Attendance

#### Create Attendance Record
```
POST /attendance
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-id",
  "employeeId": "EMP-001",
  "confidence": 0.95,
  "timestamp": 1634567890000
}

Response:
{
  "success": true,
  "data": {
    "id": "att-id",
    "userId": "user-id",
    "timestamp": 1634567890000,
    "synced": true
  }
}
```

#### Get Attendance Records
```
GET /attendance?userId=user-id&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "att-id",
      "userId": "user-id",
      "employeeId": "EMP-001",
      "timestamp": 1634567890000,
      "confidence": 0.95
    }
  ]
}
```

#### Get Attendance Statistics
```
GET /attendance/stats?userId=user-id&period=month
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalDays": 20,
    "presentDays": 19,
    "absentDays": 1,
    "averageConfidence": 0.94
  }
}
```

### Embeddings

#### Upload Embedding
```
POST /embeddings
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-id",
  "embedding": "base64-encrypted-embedding",
  "sampleIndex": 1,
  "timestamp": 1634567890000
}

Response:
{
  "success": true,
  "data": {
    "id": "embedding-id",
    "userId": "user-id",
    "stored": true
  }
}
```

#### Get Embeddings
```
GET /embeddings?userId=user-id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "embedding-id",
      "userId": "user-id",
      "sampleIndex": 1,
      "timestamp": 1634567890000
    }
  ]
}
```

#### Batch Upload Embeddings
```
POST /embeddings/batch
Content-Type: application/json
Authorization: Bearer <token>

{
  "embeddings": [
    {
      "userId": "user-id",
      "embedding": "base64-data",
      "sampleIndex": 1
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "uploaded": 5,
    "failed": 0
  }
}
```

### Audit Logs

#### Create Audit Log
```
POST /audit-logs
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-id",
  "action": "RECOGNITION",
  "details": {
    "confidence": 0.95,
    "success": true
  },
  "timestamp": 1634567890000
}

Response:
{
  "success": true,
  "data": {
    "id": "log-id",
    "created": true
  }
}
```

#### Get Audit Logs
```
GET /audit-logs?userId=user-id&action=RECOGNITION
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "log-id",
      "userId": "user-id",
      "action": "RECOGNITION",
      "details": { ... },
      "timestamp": 1634567890000
    }
  ]
}
```

### Health Check

#### Get API Status
```
GET /health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1634567890000,
    "uptime": 3600000
  }
}
```

## Pagination

For list endpoints, pagination supported:
```
GET /endpoint?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc
```

## Rate Limiting

- 1000 requests per minute per device
- 100 concurrent connections
- Response headers include limits:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1634567950
  ```

## CORS Headers

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## Versioning

Current version: v1
Format: `/api/v1/endpoint`

## Deprecated

- /v0/attendance (use /api/v1/attendance instead)

## SDKs

- JavaScript/TypeScript: `npm install datalake-sdk`
- React Native: `npm install datalake-react-native`
- Python: `pip install datalake-sdk`

## Examples

### JavaScript
```javascript
const response = await fetch('https://api.secureface.com/api/v1/attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: 'user-id',
    employeeId: 'EMP-001',
    confidence: 0.95,
    timestamp: Date.now()
  })
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://api.secureface.com/api/v1/attendance',
    headers=headers,
    json={
        'userId': 'user-id',
        'employeeId': 'EMP-001',
        'confidence': 0.95,
        'timestamp': int(time.time() * 1000)
    }
)
```

## Support

- Documentation: https://docs.datalake.com
- Email: api-support@datalake.com
- Issues: https://github.com/datalake/faceauth/issues
