# SecureFace-Offline Models

This directory contains TensorFlow Lite models for facial recognition and detection.

## Models

### MobileFaceNet (mobilefacenet.tflite)
- **Purpose**: Face recognition and embedding generation
- **Input**: Aligned face image (112x112 RGB)
- **Output**: 128-dimensional embedding vector
- **Size**: ~8 MB
- **Architecture**: MobileNet-based CNN

### Face Detection (face_detection_short_range.tflite)
- **Purpose**: Real-time face detection
- **Input**: Camera frame (variable size)
- **Output**: Face bounding boxes with confidence
- **Size**: ~10 MB
- **Architecture**: BlazeFace (lightweight for mobile)

### Face Landmarks (face_landmarks.tflite)
- **Purpose**: Facial landmark detection (468 points)
- **Input**: Face image
- **Output**: 3D landmark coordinates
- **Size**: ~6 MB
- **Architecture**: MediaPipe Face Mesh

## Download

To download all models:

```bash
bash ../scripts/download-models.sh
```

## Model Performance

### Recognition Accuracy
- Same person recognition: >95%
- False positive rate: <5%
- Processing time: <500ms on mid-range devices

### Face Detection
- Detection accuracy: >98%
- Speed: <100ms per frame
- Handles multiple faces

### Landmarks
- Landmark accuracy: >90%
- 468 facial landmarks
- Real-time processing

## Optimization Techniques

- **Quantization**: INT8 quantized versions available
- **Pruning**: Model pruning for size reduction
- **Distillation**: Knowledge distillation from larger models
- **Mobile Optimization**: Designed for mobile devices

## Requirements

- TensorFlow Lite Interpreter
- Minimum API level 26 (Android 8.0)
- GPU acceleration (optional, for faster inference)

## Model Training

Models are pre-trained on:
- MS-Celeb-1M dataset
- VGG-Face2 dataset
- Diverse demographic representation
- Outdoor lighting conditions

## License

These models are provided as-is for research and development purposes.
