# Architecture Guide

## System Overview

SecureFace-Offline is a comprehensive offline facial recognition and liveness detection system designed for Android devices with zero-network operation capability.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANDROID DEVICE (3GB+ RAM)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               REACT NATIVE APP (TypeScript)              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │  │
│  │  │   Screens       │  │   Services      │  │Components│ │  │
│  │  ├─────────────────┤  ├─────────────────┤  └──────────┘ │  │
│  │  │ • Home          │  │ • TFLite Model  │              │  │
│  │  │ • Registration  │  │ • Face Recog    │              │  │
│  │  │ • Recognition   │  │ • Liveness Det  │              │  │
│  │  │ • Attendance    │  │ • Anti-Spoofing │              │  │
│  │  │ • Settings      │  │ • Encryption    │              │  │
│  │  │                 │  │ • Database      │              │  │
│  │  │                 │  │ • AWS Sync      │              │  │
│  │  └─────────────────┘  └─────────────────┘              │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │                                  │
│  ┌────────────────────────┬──┴──┬────────────────────────┐    │
│  │                        │     │                        │    │
│  ▼                        ▼     ▼                        ▼    │
│ ┌────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│ │   Camera   │    │ TensorFlow Lite│    │ Android Keystore│  │
│ │ (MediaPipe)│    │   MobileFaceNet│    │   (Encryption)  │  │
│ └────────────┘    └────────────────┘    └─────────────────┘  │
│       │                    │                      │            │
│       └────────────────────┴──────────────────────┘            │
│                            │                                   │
│              ┌─────────────┴─────────────┐                    │
│              ▼                           ▼                    │
│        ┌──────────────┐          ┌──────────────────┐        │
│        │   SQLite DB  │          │   MMKV Storage   │        │
│        │ (Encrypted)  │          │  (Key-Value)     │        │
│        └──────────────┘          └──────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Network Available?
                    ┌────────┴────────┐
                    │                 │
                   YES               NO
                    │                 │
                    ▼                 │
          ┌──────────────────┐        │
          │   AWS Backend    │        │
          ├──────────────────┤        │
          │ • Express.js API │        │
          │ • DynamoDB       │        │
          │ • Lambda         │        │
          │ • API Gateway    │        │
          └──────────────────┘        │
                                      │
                        Work Offline  │
                        Store Locally ▲
```

## Component Architecture

### 1. Mobile Application Layer

#### Screens
- **HomeScreen**: Dashboard with user list and sync status
- **RegistrationScreen**: User registration form
- **RegistrationCameraScreen**: Face sample capture
- **RecognitionScreen**: Real-time recognition and attendance
- **AttendanceHistoryScreen**: View attendance records
- **SettingsScreen**: App configuration and statistics

#### Services
- **CameraService**: Camera permission and frame management
- **TFLiteModelService**: Model loading and inference
- **FaceRecognitionService**: Face matching and similarity
- **LivenessDetectionService**: Liveness verification
- **AntiSpoofingService**: Spoofing detection
- **DatabaseService**: SQLite operations
- **EncryptionService**: AES-256 encryption
- **AWSSyncService**: Offline-to-online sync

### 2. Data Flow

#### Registration Flow
```
User Input (name, ID)
  ↓
User Created
  ↓
Capture Face Samples (5)
  ↓
Generate Embeddings (TFLite)
  ↓
Encrypt Embeddings (AES-256)
  ↓
Store in SQLite
  ↓
Ready for Recognition
```

#### Recognition Flow
```
Start Camera
  ↓
Detect Face (TFLite Detection)
  ↓
Generate Embedding (MobileFaceNet)
  ↓
Compare with Stored (Cosine Similarity)
  ↓
Calculate Confidence
  ↓
If Recognized:
  - Liveness Detection
  - Anti-Spoofing Check
  - Mark Attendance
  - Queue for Sync
```

#### Sync Flow
```
Network Available
  ↓
Check Pending Items (SyncQueue)
  ↓
For Each Item:
  - Encrypt if needed
  - POST to API
  - Mark as synced
  - Handle errors with retry
  ↓
Delete Synced Items
  ↓
Update Last Sync Time
```

### 3. Offline-First Strategy

**Local Storage Priority**
- All data stored locally first
- No requirement for network
- Graceful degradation when offline

**Sync When Available**
- Automatic background sync
- Manual sync option
- Retry logic with exponential backoff

**Data Purge After Sync**
- Remove synced items
- Free local storage
- Maintain audit trail

### 4. Face Recognition Engine

#### Process Pipeline
```
Input Frame → Detect Faces → Extract ROI → Align Face
                ↓
            Normalize Input
                ↓
         MobileFaceNet Model
                ↓
         Generate 128-D Embedding
                ↓
         Normalize Embedding
                ↓
         Cosine Similarity with DB
                ↓
         Calculate Confidence
                ↓
         Match Result
```

#### Cosine Similarity
```
similarity = (A · B) / (||A|| * ||B||)

Where:
- A: Current embedding
- B: Database embedding
- ||A||, ||B||: Norms (magnitudes)

Threshold: 0.5 (50% similarity for match)
Confidence: (similarity + 1) / 2 (normalized to 0-1)
```

### 5. Liveness Detection

#### Challenge Types
1. **Blink**: Eye aspect ratio drops and rises
2. **Smile**: Mouth opens >threshold
3. **Head Left**: Head rotates left >20°
4. **Head Right**: Head rotates right >20°

#### Implementation
```
For Each Challenge:
  1. Generate random challenge
  2. Process frame at 30 FPS
  3. Extract landmarks (MediaPipe)
  4. Calculate metric (EAR, MAO, yaw)
  5. Compare with threshold
  6. Accumulate frames (need 5 positive)
  7. Mark challenge complete
  
Liveness Passed: All 3 challenges completed
Processing Time: ~15-30 seconds
```

### 6. Anti-Spoofing Detection

#### Techniques

**Printed Photo Detection**
- Low Z-variance in face landmarks
- Low face detection confidence
- Flat appearance

**Screen Replay Detection**
- Identical motion across frames
- Perfect symmetry
- Uniform lighting

**Motion Consistency**
- Smooth acceleration profile
- Natural jitter patterns
- Non-repetitive motion

**Depth Approximation**
- Z-coordinate variance
- 3D point cloud analysis
- Face depth estimation

### 7. Encryption Architecture

#### Key Management
```
Device ──→ Android Keystore ←── AES-256 Key
                  ↓
           Hardware-backed
           (if available)
                  ↓
           Software-backed
           (fallback)
```

#### Encryption Scheme
```
PlainEmbedding (128 floats)
        ↓
JSON Stringify
        ↓
UTF-8 Encode
        ↓
AES-256-CBC Encrypt
        ↓
Base64 Encode
        ↓
Store in DB
```

#### Decryption Scheme
```
Encrypted Data (Base64)
        ↓
Base64 Decode
        ↓
AES-256-CBC Decrypt
        ↓
UTF-8 Decode
        ↓
JSON Parse
        ↓
Number Array
```

### 8. Database Schema

#### SQLite Tables

**users**
```sql
id TEXT PRIMARY KEY
name TEXT
employee_id TEXT UNIQUE
created_at INTEGER
updated_at INTEGER
```

**embeddings**
```sql
id TEXT PRIMARY KEY
user_id TEXT FOREIGN KEY
embedding TEXT (encrypted)
created_at INTEGER
sample_index INTEGER
```

**attendance**
```sql
id TEXT PRIMARY KEY
user_id TEXT FOREIGN KEY
user_name TEXT
employee_id TEXT
timestamp INTEGER
confidence REAL
synced INTEGER
synced_at INTEGER
```

**audit_logs**
```sql
id TEXT PRIMARY KEY
user_id TEXT
action TEXT
details TEXT
timestamp INTEGER
synced INTEGER
```

**sync_queue**
```sql
id TEXT PRIMARY KEY
type TEXT
data TEXT (encrypted)
created_at INTEGER
synced INTEGER
sync_attempts INTEGER
```

### 9. Backend API

#### Endpoints

**Attendance**
- POST /api/attendance - Create record
- GET /api/attendance/:userId - Get records

**Embeddings**
- POST /api/embeddings - Upload
- GET /api/embeddings/:userId - Retrieve

**Audit**
- POST /api/audit-logs - Create log

**Device**
- POST /api/devices/register - Register
- POST /api/devices/verify - Verify

#### Request/Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": 1234567890
}
```

### 10. AWS Infrastructure

#### DynamoDB Tables

**attendance**
- PK: userId (S)
- SK: timestamp (N)
- TTL: 90 days
- Streams: enabled

**embeddings**
- PK: userId (S)
- SK: id (S)
- TTL: 365 days

**audit_logs**
- PK: userId (S)
- SK: timestamp (N)
- TTL: 180 days

**devices**
- PK: deviceId (S)
- No TTL
- PITR: enabled

#### API Gateway
- HTTP/2 protocol
- CORS enabled
- CloudWatch logging
- Request throttling

## Performance Characteristics

### Recognition
- Model Size: <20 MB
- Inference Time: <500ms
- Total Latency: <1000ms
- Accuracy: >95%

### Liveness
- Duration: 15-30 seconds
- Accuracy: >90%
- Challenges: 3

### Anti-Spoofing
- Accuracy: >85%
- False Positive Rate: <5%
- Processing: Real-time

### Storage
- Embeddings: ~400 bytes/user (encrypted)
- Attendance Record: ~200 bytes
- Database Growth: ~1-2 MB/year per 100 users

### Memory
- App Startup: ~100 MB
- During Recognition: ~300 MB
- Idle: ~100 MB
- Total Limit: 500 MB

## Security Considerations

### Data Protection
- AES-256 encryption for embeddings
- Hardware-backed keystore when available
- No raw image storage
- Secure deletion of temporary data

### Network Security
- HTTPS/TLS for all API calls
- JWT token authentication
- Request signature verification
- Rate limiting and DDoS protection

### Privacy
- No face image retention
- No video recording
- Automatic data purge
- GDPR compliant

## Scalability

### Mobile App
- Supports 1000+ registered users
- Linear time complexity for recognition
- Efficient memory management

### Backend
- DynamoDB on-demand billing
- Auto-scaling Lambda functions
- CDN for static assets
- CloudFront distribution

### Database
- Partitioning by userId
- TTL for automatic cleanup
- PITR for disaster recovery
- Global secondary indexes

## Monitoring and Logging

### Metrics
- Recognition latency
- Success rates
- Error rates
- Sync status
- Storage usage

### Logs
- CloudWatch Logs
- Application logs
- Audit trails
- Performance metrics

### Alerts
- High error rates
- Sync failures
- Storage warnings
- Performance degradation
