import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { scanFaces, Face as ScannedFace } from 'vision-camera-face-detector';
import { resize } from 'vision-camera-resize-plugin';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { CONSTANTS, ERROR_CODES } from '../utils/constants';
import TFLiteModelService from '../services/TFLiteModelService';
import DatabaseService from '../services/DatabaseService';
import { generateUUID, getCurrentTimestamp, normalizeEmbedding } from '../utils/helpers';
import { calculateFaceAspectRatio, calculateEyeAspectRatio } from '../utils/helpers';
import { FaceEmbedding, RegistrationProgress } from '../types';

type RegistrationCameraScreenProps = {
  navigation: StackNavigationProp<any>;
  route: any;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const RegistrationCameraScreen: React.FC<RegistrationCameraScreenProps> = ({
  navigation,
  route,
}) => {
  const { userId, userName } = route.params;
  const cameraRef = useRef<Camera>(null);
  const frameProcessorRef = useRef<any>(null);

  const [progress, setProgress] = useState<RegistrationProgress>({
    totalSamples: CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION,
    collectedSamples: 0,
    averageQuality: 0,
    ready: false,
  });

  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [facesDetected, setFacesDetected] = useState(false);
  const [latestFaceBound, setLatestFaceBound] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [latestEmbedding, setLatestEmbedding] = useState<number[] | null>(null);

  useEffect(() => {
    initializeCamera();
    return () => {
      TFLiteModelService.unloadModels();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setLoading(true);
      await TFLiteModelService.initialize();
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', `Failed to initialize: ${error}`);
      navigation.goBack();
    }
  };

  const onFacesDetected = (faces: ScannedFace[]) => {
    if (!faces || faces.length === 0) {
      setFacesDetected(false);
      setLatestFaceBound(null);
      return;
    }

    const f = faces[0];
    setFacesDetected(true);
    setLatestFaceBound({ x: f.bounds.x, y: f.bounds.y, width: f.bounds.width, height: f.bounds.height });
  };

  const onEmbeddingComputed = (embedding: number[]) => {
    setLatestEmbedding(embedding);
  };

  const tfState = useTensorflowModel(require('../../assets/models/mobilefacenet.tflite'), [] as any);
  const tfModel = tfState.state === 'loaded' ? (tfState.model as any) : undefined;

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      const faces = scanFaces(frame);
      runOnJS(onFacesDetected)(faces);

      if (faces && faces.length > 0 && typeof tfModel !== 'undefined') {
        // Resize to 112x112 rgb uint8 for MobileFaceNet
        const resized = resize(frame, {
          scale: { width: 112 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        // Extract contiguous ArrayBuffer slice
        const inputBuffer = resized.buffer.slice(resized.byteOffset, resized.byteOffset + resized.byteLength);

        const outputs = tfModel.runSync([inputBuffer]);
        if (outputs && outputs[0]) {
          const out = new Float32Array(outputs[0]);
          const arr = [];
          for (let i = 0; i < out.length; i++) arr.push(out[i]);
          runOnJS(onEmbeddingComputed)(arr);
        }
      }
    } catch (e) {
      // worklet suppressed
    }
  }, [tfModel]);

  const processCameraFrame = async (frame: any) => {
    if (capturing || !TFLiteModelService.isModelLoaded()) {
      return;
    }

    try {
      // Convert frame to CameraFrame format
      const cameraFrame = {
        data: frame.image.data,
        width: frame.image.width,
        height: frame.image.height,
        format: 'native',
      };

      // Detect faces
      const faces = await TFLiteModelService.detectFaces(cameraFrame);

      if (faces.length > 0) {
        setFacesDetected(true);
        const face = faces[0];

        // Generate embedding
        const embedding = await TFLiteModelService.generateEmbedding(cameraFrame, {
          x: face.x,
          y: face.y,
          width: face.width,
          height: face.height,
        });

        if (embedding && embedding.length > 0) {
          const normalized = normalizeEmbedding(embedding);
          return normalized;
        }
      } else {
        setFacesDetected(false);
      }
    } catch (error) {
      console.warn('Frame processing error:', error);
    }
  };

  const captureFaceSample = async () => {
    if (progress.collectedSamples >= CONSTANTS.MAX_SAMPLES_FOR_REGISTRATION) {
      Alert.alert('Info', 'Maximum samples collected. Finish registration.');
      return;
    }

    try {
      setCapturing(true);

      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      // Capture a high-quality photo and generate embedding from it
      // Prefer latest real-time embedding if available (faster)
      let embedding: number[] | null = null;
      if (latestEmbedding && latestEmbedding.length > 0) {
        embedding = latestEmbedding;
      } else {
        const photo = await cameraRef.current.takePhoto({ skipMetadata: true });

        if (!latestFaceBound) {
          Alert.alert('Error', 'No face detected. Please align your face in the frame.');
          return;
        }

        embedding = await TFLiteModelService.generateEmbeddingFromFile(photo, latestFaceBound);
      }

      if (!embedding || embedding.length === 0) {
        Alert.alert('Error', 'Failed to generate embedding for captured sample.');
        return;
      }

      const normalized = normalizeEmbedding(embedding as number[]);
      const newEmbeddings = [...embeddings, normalized];
      setEmbeddings(newEmbeddings);

      const newProgress = {
        totalSamples: CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION,
        collectedSamples: newEmbeddings.length,
        // Compute a simple quality metric based on face aspect ratio and eye openness if available
        averageQuality: (() => {
          try {
            if (!latestEmbedding && !latestFaceBound) return 0.6;
            // face aspect ratio heuristic
            // attempt to use landmarks if available via global latestLandmarks on screen (not available here),
            // fallback to face bounding box aspect ratio
            const ar = latestFaceBound ? (latestFaceBound.width > 0 ? latestFaceBound.height / latestFaceBound.width : 0) : 0;
            const faceScore = 1 - Math.abs(0.9 - ar); // prefer tall faces slightly
            return Math.min(1, Math.max(0.4, faceScore));
          } catch (e) {
            return 0.7;
          }
        })(),
        ready: newEmbeddings.length >= CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION,
      };

      setProgress(newProgress);
    } catch (error) {
      Alert.alert('Error', `Failed to capture sample: ${error}`);
    } finally {
      setCapturing(false);
    }
  };

  const finishRegistration = async () => {
    if (embeddings.length < CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION) {
      Alert.alert('Error', `Please capture at least ${CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION} samples`);
      return;
    }

    try {
      setLoading(true);

      // Store embeddings
      for (let i = 0; i < embeddings.length; i++) {
        const embedding: FaceEmbedding = {
          id: generateUUID(),
          userId,
          embedding: embeddings[i],
          createdAt: getCurrentTimestamp(),
          sampleIndex: i,
        };

        await DatabaseService.createEmbedding(embedding);
      }

      Alert.alert('Success', `User ${userName} registered successfully`, [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to finish registration: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Capture Face Samples</Text>
        <Text style={styles.headerSubtitle}>{userName}</Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={{ position: 'front' }}
          isActive={true}
          photo={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        />
        <View style={styles.faceIndicator}>
          {facesDetected ? (
            <View style={styles.faceDetectedBox} />
          ) : (
            <View style={styles.faceNotDetectedBox} />
          )}
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(progress.collectedSamples / progress.totalSamples) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Samples: {progress.collectedSamples}/{progress.totalSamples}
        </Text>
        <Text style={styles.qualityText}>
          Quality: {Math.round(progress.averageQuality * 100)}%
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.captureButton, capturing && styles.buttonDisabled]}
          onPress={captureFaceSample}
          disabled={capturing || progress.collectedSamples >= CONSTANTS.MAX_SAMPLES_FOR_REGISTRATION}
        >
          {capturing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.captureButtonText}>Capture Sample</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.finishButton, (!progress.ready || loading) && styles.buttonDisabled]}
          onPress={finishRegistration}
          disabled={!progress.ready || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.finishButtonText}>Finish Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  faceIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -60,
    width: 120,
    height: 120,
  },
  faceDetectedBox: {
    width: 120,
    height: 120,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 60,
  },
  faceNotDetectedBox: {
    width: 120,
    height: 120,
    borderWidth: 3,
    borderColor: '#f44336',
    borderRadius: 60,
  },
  progressSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  qualityText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  buttonContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    flexDirection: 'row',
    gap: 10,
  },
  captureButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  captureButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  finishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
});
