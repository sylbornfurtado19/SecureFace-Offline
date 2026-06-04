#!/bin/bash

# Setup development environment

set -e

echo "Setting up SecureFace-Offline development environment..."

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "Error: Node.js not installed"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "Error: npm not installed"
  exit 1
fi

if ! command -v java &> /dev/null; then
  echo "Error: Java not installed"
  exit 1
fi

if [ -z "$ANDROID_HOME" ]; then
  echo "Error: ANDROID_HOME not set"
  exit 1
fi

echo "Prerequisites OK"
echo ""

# Install mobile app dependencies
echo "Installing mobile app dependencies..."
cd mobile-app
npm install
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Download models
echo "Downloading TensorFlow Lite models..."
bash scripts/download-models.sh

# Generate encryption key example
echo ""
echo "Generating example .env file..."
cat > backend/.env.example << 'EOF'
AWS_REGION=us-east-1
ATTENDANCE_TABLE=attendance
EMBEDDINGS_TABLE=embeddings
AUDIT_LOG_TABLE=audit_logs
DEVICES_TABLE=devices
JWT_SECRET="$(openssl rand -base64 32)"
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=*
EOF

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy backend/.env.example to backend/.env"
echo "2. Update environment variables in backend/.env"
echo "3. Run: npm run android (in mobile-app directory)"
echo "4. Run: npm run dev (in backend directory)"
echo ""
