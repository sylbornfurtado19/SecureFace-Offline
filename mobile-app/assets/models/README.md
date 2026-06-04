Model assets for SecureFace-Offline

This folder contains the TensorFlow Lite models used by the app.

Required filenames:

- `mobilefacenet.tflite` - MobileFaceNet face embedding model (112x112 RGB input)
- `face_detection_short_range.tflite` - short-range face detector

Notes:
- Keep the models small and quantized when possible for better mobile performance.
- The repository includes the required model binaries for offline use.
