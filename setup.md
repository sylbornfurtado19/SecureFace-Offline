# Setup Guide

## Prerequisites

### System Requirements
- Windows 10/11, macOS 10.14+, or Linux
- Node.js 16+
- Java Development Kit (JDK) 11+
- Android SDK (API 26-34)
- Gradle 7.0+
- React Native CLI

### Installation

#### 1. Install Node.js
```bash
# Windows (using Chocolatey)
choco install nodejs

# macOS (using Homebrew)
brew install node

# Linux (Ubuntu)
sudo apt-get install nodejs npm
```

#### 2. Install Java
```bash
# Download from https://www.oracle.com/java/technologies/downloads/

# macOS
brew install openjdk@11

# Linux
sudo apt-get install openjdk-11-jdk
```

#### 3. Install Android SDK
```bash
# Download Android Studio from https://developer.android.com/studio
# Follow installation wizard
# Configure ANDROID_HOME environment variable
```

#### 4. Install React Native CLI
```bash
npm install -g react-native-cli
```

## Mobile App Setup

### 1. Install Dependencies
```bash
cd mobile-app
npm install
```

### 2. Download TensorFlow Lite Models
```bash
# Create models directory
mkdir -p assets/models

# Download models (download these from TensorFlow Hub)
# - mobilefacenet.tflite (~8 MB)
# - face_detection_short_range.tflite (~10 MB)
# Place in assets/models/
```

### 3. Configure Android Build
```bash
cd android

# Generate debug keystore if not exists
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000

# Clean build
./gradlew clean

# Back to root
cd ..
```

### 4. Build and Run
```bash
# Development build
npm run android

# Release build
npm run build:android
```

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Create .env file
cat > .env << EOF
AWS_REGION=us-east-1
ATTENDANCE_TABLE=attendance
EMBEDDINGS_TABLE=embeddings
AUDIT_LOG_TABLE=audit_logs
DEVICES_TABLE=devices
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
PORT=3000
EOF
```

### 3. Development Server
```bash
npm run dev
# Server running on http://localhost:3000
```

### 4. Production Build
```bash
npm run build
npm start
```

## AWS Infrastructure Setup

### 1. AWS Account Setup
- Create AWS account
- Configure AWS CLI credentials
- Install Terraform

### 2. Deploy Infrastructure
```bash
cd aws/terraform

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Deploy
terraform apply
```

### 3. Configure Backend
```bash
# Get API Gateway URL
ENDPOINT=$(terraform output api_gateway_url)

# Update mobile app config
# Edit mobile-app/src/services/AWSSyncService.ts
# Set the API_ENDPOINT to the above URL
```

## Database Setup

### Local Database (SQLite)
- Automatically created on app first launch
	- Located at: `/data/data/com.secureface.offline/databases/faceauth.db`

### AWS DynamoDB
- Created by Terraform
- Tables: attendance, embeddings, audit_logs, devices
- TTL enabled for automatic cleanup

## Security Setup

### 1. Generate Encryption Keys
```bash
# Keys generated automatically on app first launch
# Stored in Android Keystore
```

### 2. API Authentication
```bash
# Backend will use JWT tokens
# Configure JWT_SECRET in .env file
```

### 3. HTTPS Setup
```bash
# Generate SSL certificate for HTTPS
# Copy to backend/ssl/
# Configure in Express app
```

## Testing Setup

### 1. Unit Tests
```bash
cd mobile-app
npm test
```

### 2. Integration Tests
```bash
npm test -- --testPathPattern=integration
```

### 3. Backend Tests
```bash
cd backend
npm test
```

## Configuration

### Mobile App Configuration
Edit `src/utils/constants.ts`:
- `CAMERA_RESOLUTION_WIDTH/HEIGHT`
- `MIN_SAMPLES_FOR_REGISTRATION`
- `RECOGNITION_CONFIDENCE_THRESHOLD`
- `LIVENESS_CHALLENGES_COUNT`
- etc.

### Backend Configuration
Edit `.env`:
- `AWS_REGION`
- `PORT`
- `JWT_SECRET`
- Table names
- etc.

### Terraform Configuration
Edit `aws/terraform/main.tf`:
- `aws_region`
- `environment`
- DynamoDB capacity
- etc.

## Verification

### 1. Verify Mobile App
```bash
# Check app starts without errors
# Navigate to Home screen
# Check Registered Users section
```

### 2. Verify Backend
```bash
curl http://localhost:3000/health
# Should return: {"success":true,"status":"healthy"}
```

### 3. Verify AWS
```bash
# Check DynamoDB tables exist
aws dynamodb list-tables --region us-east-1

# Check API Gateway
aws apigateway get-apis --region us-east-1
```

## Troubleshooting

### Android Build Issues
```bash
# Clear gradle cache
./gradlew clean

# Update gradle
./gradlew wrapper --gradle-version 8.0

# Check Java version
javac -version  # Should be 11+
```

### Model Loading Issues
```bash
# Verify models in assets/models/
ls mobile-app/assets/models/

# Check file sizes
# mobilefacenet.tflite should be ~8 MB
# face_detection_short_range.tflite should be ~10 MB
```

### AWS Deployment Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Terraform state
terraform show

# Review logs
aws logs tail /aws/apigateway/face-auth
```

## Performance Tuning

### Mobile App
- Reduce camera FPS to 30
- Limit face detection calls
- Use frame skipping for non-critical operations

### Backend
- Enable DynamoDB on-demand billing
- Configure CloudWatch alarms
- Set up auto-scaling if needed

### Database
- Enable DynamoDB streams
- Configure point-in-time recovery
- Monitor query patterns

## Monitoring

### Logs
```bash
# Mobile app logs
adb logcat com.secureface.offline

# Backend logs
tail -f backend.log

# AWS logs
aws logs tail /aws/apigateway/face-auth --follow
```

### Metrics
- Recognition latency
- Liveness detection success rate
- Sync success rate
- Model inference time

## Updates

### Mobile App Updates
```bash
# Increment version in package.json
npm run build:android
# Upload to Play Store
```

### Backend Updates
```bash
# Increment version
npm run build
# Deploy to Lambda or server
```

### Model Updates
```bash
# Replace model files in assets/models/
# Increment app version
# Deploy new build
```

## Next Steps

1. Review [Architecture Guide](architecture.md)
2. Check [Testing Guide](testing-guide.md)
3. Read [API Documentation](backend/README.md)
4. Review security best practices
