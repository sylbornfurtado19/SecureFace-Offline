export interface User {
  id: string;
  name: string;
  employeeId: string;
  createdAt: number;
  updatedAt: number;
}

export interface FaceEmbedding {
  id: string;
  userId: string;
  embedding: number[];
  createdAt: number;
  sampleIndex: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  timestamp: number;
  confidence: number;
  synced: boolean;
  syncedAt?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: number;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'attendance' | 'embedding' | 'audit';
  data: any;
  createdAt: number;
  synced: boolean;
  syncAttempts: number;
}

export interface LivenessChallenge {
  id: string;
  type: 'blink' | 'smile' | 'head_left' | 'head_right';
  completed: boolean;
  detectionFrames: number[];
  startTime: number;
  endTime?: number;
}

export interface RecognitionResult {
  recognized: boolean;
  userId: string;
  confidence: number;
  embeddingDistance: number;
  processingTime: number;
}

export interface LivenessResult {
  passed: boolean;
  confidence: number;
  challengesPassed: string[];
  totalChallenges: number;
  processingTime: number;
}

export interface RegistrationProgress {
  totalSamples: number;
  collectedSamples: number;
  averageQuality: number;
  ready: boolean;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: number;
  pendingItems: number;
  syncError?: string;
}

export interface CameraFrame {
  data: ArrayBuffer;
  width: number;
  height: number;
  format: string;
}

export interface FaceLandmarks {
  landmarks: Array<[number, number, number]>;
  confidence: number;
  faceBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
