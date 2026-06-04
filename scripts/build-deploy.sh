#!/bin/bash

# Deploy mobile app to Android device

set -e

echo "Building and deploying Android app..."

cd mobile-app

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf android/app/build
rm -rf android/build

# Install dependencies
echo "Installing dependencies..."
npm install

# Build APK
echo "Building APK..."
cd android
./gradlew assembleRelease

cd ..

# Find APK file
APK_FILE=$(find android/app/build -name "*release*.apk" | head -1)

if [ -z "$APK_FILE" ]; then
  echo "Error: APK file not found"
  exit 1
fi

echo "APK built: $APK_FILE"

# Install on connected device
if [ -n "$(adb devices | grep 'device$')" ]; then
  echo "Installing on device..."
  adb install -r "$APK_FILE"
  echo "App installed successfully!"
else
  echo "No device connected. APK available at: $APK_FILE"
  echo "To install: adb install -r $APK_FILE"
fi
