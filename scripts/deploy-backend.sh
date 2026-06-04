#!/bin/bash

# Deploy backend to AWS

set -e

echo "Deploying backend to AWS..."

cd backend

# Build
echo "Building backend..."
npm run build

# Configure environment
echo "Configuring environment..."
export AWS_REGION=${AWS_REGION:-us-east-1}
export NODE_ENV=production

# Get deployment bucket
BUCKET_NAME="secureface-backend-$(date +%s)"
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" || true

# Upload built application
echo "Uploading to S3..."
zip -r deployment.zip dist node_modules package.json
aws s3 cp deployment.zip "s3://$BUCKET_NAME/deployment.zip"

# Update Lambda function
echo "Updating Lambda function..."
aws lambda update-function-code \
  --function-name face-auth-api \
  --s3-bucket "$BUCKET_NAME" \
  --s3-key deployment.zip \
  --region "$AWS_REGION"

echo "Deployment completed successfully!"
echo "S3 Bucket: $BUCKET_NAME"
echo "Lambda Function: face-auth-api"
