# SecureFace-Offline

Secure offline facial recognition and liveness detection system for Android devices. Works seamlessly in zero-network environments with encrypted storage and AWS synchronization.

## Features

- **Offline-First Architecture**: Complete functionality without internet connection
- **Real-Time Face Recognition**: <1 second recognition latency on mid-range devices
- **Liveness Detection**: Offline anti-spoofing with blink, smile, and head pose detection
- **Anti-Spoofing**: Detection of printed photos, screen replays, and motion inconsistencies
- **Encrypted Storage**: AES-256 encryption for face embeddings and attendance data
- **AWS Sync**: Seamless synchronization when network becomes available
- **Lightweight Models**: <20 MB total model footprint
- **Cross-Platform**: React Native for iOS/Android (currently Android)

## Architecture

### Mobile App (React Native)
- Camera capture with MediaPipe Face Mesh
- TensorFlow Lite model inference (MobileFaceNet)
- SQLite local database
- MMKV encrypted key-value storage
- Android Keystore integration

### Backend (Node.js)
- Express API server
- DynamoDB integration
- Authentication & validation
- Audit logging

### Cloud (AWS)
- API Gateway for HTTPS endpoints
- Lambda functions for processing
- DynamoDB tables for persistence
- CloudWatch for monitoring

## Installation

### Prerequisites
- Android 8.0 (API 26) or higher
- Minimum 3GB RAM
- Node.js 16+ (for development)
- React Native CLI

### Quick Start

Clone this repository locally, then run the mobile app from `mobile-app`.

```bash
cd SecureFace-Offline/mobile-app

# Install dependencies
npm install

# Build and run
npm run android
```

## Configuration

### Environment Variables (Backend)

```env
AWS_REGION=us-east-1
ATTENDANCE_TABLE=attendance
EMBEDDINGS_TABLE=embeddings
AUDIT_LOG_TABLE=audit_logs
DEVICES_TABLE=devices
JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET
NODE_ENV=production
```

### AWS Setup

```bash
cd aws/terraform
./deploy.sh
```

## Usage

### Register User
1. Open app → Register New User
2. Enter name and employee ID
3. Capture 5 face samples
4. System generates and stores encrypted embeddings

### Mark Attendance
1. Home → Mark Attendance
2. Face is detected and recognized
3. Liveness detection challenges
4. Anti-spoofing verification
5. Attendance recorded locally
6. Automatically synced when network available

## Technical Specifications

### Performance
- **Model Size**: <20 MB
- **Recognition Latency**: <1 second
- **Liveness Detection Time**: <30 seconds
- **Memory Usage**: <500 MB

### Accuracy
- **Face Recognition**: >95% accuracy
- **Liveness Detection**: >90% accuracy
- **Anti-Spoofing**: >85% accuracy
- **Demographic Support**: Diverse Indian demographics

### Security
- AES-256 encryption for embeddings
- Android Keystore for key management
- No raw image storage
- Secure HTTPS communication
- JWT authentication

## Database Schema

### SQLite Tables

#### Users
```sql
id (PK), name, employee_id, created_at, updated_at
```

#### Embeddings
```sql
id (PK), user_id (FK), embedding (encrypted), created_at, sample_index
```

#### Attendance
```sql
id (PK), user_id (FK), employee_id, timestamp, confidence, synced
```

#### AuditLogs
```sql
id (PK), user_id, action, details, timestamp, synced
```

#### SyncQueue
```sql
id (PK), type, data (encrypted), created_at, synced, sync_attempts
```

## API Endpoints

### Attendance
- `POST /api/attendance` - Create attendance record
- `GET /api/attendance/:userId` - Get records for user

### Embeddings
- `POST /api/embeddings` - Upload encrypted embedding
- `GET /api/embeddings/:userId` - Get embeddings for user

### Audit Logs
- `POST /api/audit-logs` - Create audit log

### Devices
- `POST /api/devices/register` - Register device
- `POST /api/devices/verify` - Verify device

## Development

### Project Structure
```
SecureFace-Offline/
├── mobile-app/           # React Native app
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── services/     # Business logic
│   │   ├── components/   # Reusable components
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper functions
│   ├── android/          # Android native config
│   └── App.tsx           # Entry point
├── backend/              # Express server
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   └── types/        # TypeScript types
│   └── index.ts          # Server entry
├── aws/                  # Cloud infrastructure
│   ├── terraform/        # IaC
│   └── lambda/           # Lambda functions
├── testing/              # Test suites
├── models/               # ML models
└── docs/                 # Documentation
```

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm test -- --testPathPattern=integration

# Coverage report
npm test -- --coverage
```

## Deployment

### Backend Deployment
```bash
cd backend
npm install
npm run build
# Deploy to AWS Lambda or EC2
```

### Mobile App Deployment
```bash
cd mobile-app
npm run build:android
# Sign and upload to Play Store
```

## Troubleshooting

### Camera Permission Issues
- Ensure CAMERA permission is granted in Android settings
- Check AndroidManifest.xml permissions

### Model Loading Fails
- Verify model files are in assets folder
- Check TFLite version compatibility

### Low Recognition Accuracy
- Ensure good lighting conditions
- Increase number of registration samples
- Check for glasses or face coverings

### Sync Issues
- Verify AWS credentials are correct
- Check network connectivity
- Review CloudWatch logs

## Performance Optimization

### Memory Management
- Limit frame processing to 30 FPS
- Clear recognition cache every 60 seconds
- Use incremental garbage collection

### Model Optimization
- Quantized TFLite models
- Model pruning for size reduction
- Post-training optimization

### Battery Usage
- Disable camera when not needed
- Use background sync strategically
- Optimize database queries

## Security Considerations

### Data Protection
- All embeddings encrypted before storage
- Database encryption at rest
- HTTPS for all API communication
- JWT token expiration

### Privacy
- No face images stored
- No video files kept
- Automatic data purging after sync
- User consent tracking

## Compliance

- GDPR compliant data handling
- No biometric data retention
- Audit logging for all operations
- Data deletion on request

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

Proprietary - All rights reserved

## Support

For issues and support:
- Email: support@datalake.com
- Documentation: https://docs.datalake.com
- Issue Tracker: GitHub Issues
