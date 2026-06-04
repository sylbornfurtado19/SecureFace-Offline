import React, { useState, useRef, useEffect } from 'react';
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
import { CONSTANTS } from '../utils/constants';
import TFLiteModelService from '../services/TFLiteModelService';
import FaceRecognitionService from '../services/FaceRecognitionService';
import LivenessDetectionService from '../services/LivenessDetectionService';
import AntiSpoofingService from '../services/AntiSpoofingService';
import DatabaseService from '../services/DatabaseService';
import { generateUUID, getCurrentTimestamp } from '../utils/helpers';
import { AttendanceRecord, LivenessResult } from '../types';

type RecognitionScreenProps = {
  navigation: StackNavigationProp<any>;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const RecognitionScreen: React.FC<RecognitionScreenProps> = ({ navigation }) => {
  const cameraRef = useRef<Camera>(null);
  const [status, setStatus] = useState('ready');
  const [loading, setLoading] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState<any>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [spoofingRisk, setSpoofingRisk] = useState<any>(null);
  const [latestLandmarks, setLatestLandmarks] = useState<any | null>(null);
  const [latestFaceBound, setLatestFaceBound] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [latestEmbedding, setLatestEmbedding] = useState<number[] | null>(null);
  const embedProcessRef = useRef<{ last: number }>({ last: 0 });
  const EMBED_PROCESS_INTERVAL_MS = 900;
  const AUTO_RECOGNITION_CONFIDENCE = 0.65;

  useEffect(() => {
    initializeModels();
    return () => {
      TFLiteModelService.unloadModels();
      AntiSpoofingService.reset();
      LivenessDetectionService.reset();
    };
  }, []);

  const onFacesDetected = (faces: ScannedFace[]) => {
    if (!faces || faces.length === 0) {
      setLatestLandmarks(null);
      setLatestFaceBound(null);
      return;
    }

    const f = faces[0];
    // map contours to a simple landmarks array (z=0). If contours unavailable, fallback to box-derived keypoints.
    let landmarksArray: Array<[number, number, number]> = [];
    try {
      const contourPoints = (f.contours && (f.contours.FACE || f.contours.face)) || [];
      if (contourPoints && contourPoints.length > 0) {
        landmarksArray = contourPoints.map((p: any) => [p.x, p.y, 0]);
      } else {
        // Fallback: create coarse landmarks from bounding box
        const bx = f.bounds.x;
        const by = f.bounds.y;
        const bw = f.bounds.width;
        const bh = f.bounds.height;
        const leftEye = [bx + bw * 0.3, by + bh * 0.35, 0];
        const rightEye = [bx + bw * 0.7, by + bh * 0.35, 0];
        const nose = [bx + bw * 0.5, by + bh * 0.5, 0];
        const mouth = [bx + bw * 0.5, by + bh * 0.75, 0];
        const chin = [bx + bw * 0.5, by + bh * 0.95, 0];
        landmarksArray = [leftEye, rightEye, nose, mouth, chin];
      }
    } catch (e) {
      // ignore
    }

    setLatestLandmarks({ landmarks: landmarksArray, confidence: 1.0, faceBoundingBox: { x: f.bounds.x, y: f.bounds.y, width: f.bounds.width, height: f.bounds.height } });
    setLatestFaceBound({ x: f.bounds.x, y: f.bounds.y, width: f.bounds.width, height: f.bounds.height });
  };

  const onEmbeddingComputed = (embedding: number[]) => {
    setLatestEmbedding(embedding);

    try {
      const now = Date.now();
      if (now - embedProcessRef.current.last < EMBED_PROCESS_INTERVAL_MS) return;
      embedProcessRef.current.last = now;

      if (status !== 'ready') return;

      // Fire-and-forget recognition attempt
      (async () => {
        try {
          const result = await FaceRecognitionService.recognizeEmbedding(embedding);
          if (result && result.recognized && result.confidence >= AUTO_RECOGNITION_CONFIDENCE) {
            const user = await DatabaseService.getUser(result.userId);
            setRecognizedUser({ ...user, confidence: result.confidence });
            setStatus('liveness');
            await performLivenessDetection();
          }
        } catch (e) {
          // ignore transient recognition errors
        }
      })();
    } catch (e) {
      // ignore
    }
  };

  const tfState = useTensorflowModel(require('../../assets/models/mobilefacenet.tflite'), [] as any);
  const tfModel = tfState.state === 'loaded' ? (tfState.model as any) : undefined;

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      const faces = scanFaces(frame);
      runOnJS(onFacesDetected)(faces);

      if (faces && faces.length > 0 && typeof tfModel !== 'undefined') {
        const resized = resize(frame, {
          scale: { width: 112 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

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
      // suppressed
    }
  }, [tfModel]);

  const initializeModels = async () => {
    try {
      setLoading(true);
      await TFLiteModelService.initialize();
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', `Failed to initialize: ${error}`);
      navigation.goBack();
    }
  };

  const startRecognition = async () => {
    if (status !== 'ready') return;

    try {
      setLoading(true);
      setStatus('recognizing');
      // Use the latest embedding produced by the frame processor (worklet).
      if (!latestEmbedding || latestEmbedding.length === 0) {
        Alert.alert('Error', 'No live embedding available. Please align your face in the frame.');
        setStatus('ready');
        setLoading(false);
        return;
      }

      const embedding = latestEmbedding;

      const recognitionResult = await FaceRecognitionService.recognizeEmbedding(embedding);

      if (!recognitionResult.recognized) {
        Alert.alert('Error', 'Face not recognized');
        setStatus('ready');
        setLoading(false);
        return;
      }

      const user = await DatabaseService.getUser(recognitionResult.userId);
      setRecognizedUser({ ...user, confidence: recognitionResult.confidence });

      setStatus('liveness');
      await performLivenessDetection();
    } catch (error) {
      Alert.alert('Error', `Recognition failed: ${error}`);
      setStatus('ready');
    } finally {
      setLoading(false);
    }
  };

  const performLivenessDetection = async () => {
    try {
      LivenessDetectionService.reset();

      const startTime = Date.now();
      const maxDuration = CONSTANTS.LIVENESS_TIMEOUT_MS;
      // Process live landmark frames until liveness challenges complete or timeout
      LivenessDetectionService.initiateLivenessCheck();

      while (Date.now() - startTime < maxDuration) {
        // If landmarks available, feed them into the liveness detector
        if (latestLandmarks) {
          const res = LivenessDetectionService.processFrame(latestLandmarks);
          if (res.completed && LivenessDetectionService.getCompletedChallenges().length >= CONSTANTS.LIVENESS_CHALLENGES_COUNT) {
            break;
          }
        }

        // Small delay to allow frame updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result = await LivenessDetectionService.completeLivenessCheck();
      setLivenessResult(result);

      if (!result.passed) {
        Alert.alert('Error', 'Liveness detection failed');
        setStatus('ready');
        return;
      }

      // Perform anti-spoofing check
      performSpoofingDetection();
    } catch (error) {
      Alert.alert('Error', `Liveness detection error: ${error}`);
      setStatus('ready');
    }
  };

  const performSpoofingDetection = async () => {
    try {
      setStatus('spoofing_check');
      const landmarks = latestLandmarks;
      if (!landmarks) {
        Alert.alert('Error', 'Unable to perform spoofing check - no landmarks available');
        setStatus('ready');
        return;
      }

      const spoofingAnalysis = AntiSpoofingService.analyzeSpoofingRisk(landmarks);
      setSpoofingRisk(spoofingAnalysis);

      if (spoofingAnalysis.spoofingDetected) {
        Alert.alert('Warning', `Spoofing detected: ${spoofingAnalysis.reasons.join(', ')}`);
        setStatus('ready');
        return;
      }

      await markAttendance();
    } catch (error) {
      Alert.alert('Error', `Spoofing check error: ${error}`);
      setStatus('ready');
    }
  };

  const markAttendance = async () => {
    try {
      setStatus('marking_attendance');

      if (!recognizedUser) {
        throw new Error('User not recognized');
      }

      const record: AttendanceRecord = {
        id: generateUUID(),
        userId: recognizedUser.id,
        userName: recognizedUser.name,
        employeeId: recognizedUser.employeeId,
        timestamp: getCurrentTimestamp(),
        confidence: recognizedUser.confidence,
        synced: false,
      };

      await DatabaseService.createAttendanceRecord(record);

      Alert.alert('Success', `Attendance marked for ${recognizedUser.name}`, [
        {
          text: 'OK',
          onPress: () => {
            setStatus('ready');
            setRecognizedUser(null);
            setLivenessResult(null);
            setSpoofingRisk(null);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to mark attendance: ${error}`);
      setStatus('ready');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Text style={styles.headerSubtitle}>Face Recognition</Text>
      </View>

      <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={{ position: 'front' }}
            isActive={true}
            photo={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={8}
          />
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        {recognizedUser ? (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>Recognized User</Text>
            <Text style={styles.userInfoName}>{recognizedUser.name}</Text>
            <Text style={styles.userInfoId}>{recognizedUser.employeeId}</Text>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(recognizedUser.confidence * 100)}%
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Waiting for face detection...</Text>
        )}

        {livenessResult && (
          <View style={styles.livenessInfo}>
            <Text style={styles.livenessStatus}>
              Liveness: {livenessResult.passed ? 'PASSED' : 'FAILED'}
            </Text>
            <Text style={styles.challengesText}>
              Challenges: {livenessResult.challengesPassed.join(', ')}
            </Text>
          </View>
        )}

        {spoofingRisk && (
          <View style={[styles.spoofingInfo, spoofingRisk.spoofingDetected && styles.spoofingWarning]}>
            <Text style={styles.spoofingText}>
              Spoofing Risk: {Math.round(spoofingRisk.confidence * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.startButton, (loading || status !== 'ready') && styles.buttonDisabled]}
          onPress={startRecognition}
          disabled={loading || status !== 'ready'}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.startButtonText}>Start Recognition</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Back</Text>
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
  statusOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    minHeight: 80,
  },
  userInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  userInfoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  userInfoName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 3,
  },
  userInfoId: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  confidenceText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 5,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontSize: 14,
  },
  livenessInfo: {
    marginTop: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  livenessStatus: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  challengesText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 3,
  },
  spoofingInfo: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  spoofingWarning: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderLeftColor: '#f44336',
  },
  spoofingText: {
    color: '#FFC107',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    flexDirection: 'row',
    gap: 10,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
