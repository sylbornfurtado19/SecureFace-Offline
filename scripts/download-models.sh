#!/bin/bash

# Download TensorFlow Lite Models for Facial Recognition

set -e

MODELS_DIR="mobile-app/assets/models"
mkdir -p "$MODELS_DIR"

echo "Downloading TensorFlow Lite models..."

# MobileFaceNet model (face recognition)
echo "Downloading MobileFaceNet..."
curl -L -o "$MODELS_DIR/mobilefacenet.tflite" \
  "https://storage.googleapis.com/mediapipe-models/face_recognizer/face_recognizer/float32/1/face_recognizer.tflite"

# Face detection model (short range - for phones)
echo "Downloading Face Detection model..."
curl -L -o "$MODELS_DIR/face_detection_short_range.tflite" \
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float32/1/blaze_face_short_range.tflite"

# Face landmarks model (MediaPipe Face Mesh)
echo "Downloading Face Landmarks model..."
curl -L -o "$MODELS_DIR/face_landmarks.tflite" \
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float32/1/face_landmarker.tflite"

echo "Models downloaded successfully!"

# Verify models
echo ""
echo "Model files:"
ls -lh "$MODELS_DIR"/*.tflite

# Calculate total size
TOTAL_SIZE=$(du -sh "$MODELS_DIR" | cut -f1)
echo ""
echo "Total model size: $TOTAL_SIZE"
