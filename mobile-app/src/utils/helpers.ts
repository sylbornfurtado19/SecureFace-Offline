import { Platform } from 'react-native';

export const cosineSimilarity = (a: number[], b: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

export const euclideanDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const calculateAverageEmbedding = (embeddings: number[][]): number[] => {
  if (embeddings.length === 0) {
    return [];
  }

  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  for (let i = 0; i < dim; i++) {
    let sum = 0;
    for (let j = 0; j < embeddings.length; j++) {
      sum += embeddings[j][i];
    }
    avg[i] = sum / embeddings.length;
  }

  // Normalize
  let norm = 0;
  for (let i = 0; i < avg.length; i++) {
    norm += avg[i] * avg[i];
  }
  norm = Math.sqrt(norm);

  for (let i = 0; i < avg.length; i++) {
    avg[i] /= norm;
  }

  return avg;
};

export const normalizeEmbedding = (embedding: number[]): number[] => {
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return embedding;
  }

  return embedding.map(v => v / norm);
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const calculateFaceAspectRatio = (landmarks: Array<[number, number, number]>): number => {
  // Assuming standard MediaPipe face landmarks
  // Eyes: 33, 133 (left and right)
  // Mouth: 13, 14 (center top and bottom)
  const leftEye = landmarks[33];
  const rightEye = landmarks[133];
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];

  if (!leftEye || !rightEye || !mouthTop || !mouthBottom) {
    return 0;
  }

  const eyeDistance = Math.sqrt(
    Math.pow(rightEye[0] - leftEye[0], 2) + Math.pow(rightEye[1] - leftEye[1], 2)
  );
  const mouthDistance = Math.sqrt(
    Math.pow(mouthBottom[0] - mouthTop[0], 2) + Math.pow(mouthBottom[1] - mouthTop[1], 2)
  );

  return eyeDistance > 0 ? mouthDistance / eyeDistance : 0;
};

export const calculateHeadPose = (landmarks: Array<[number, number, number]>): {
  pitch: number;
  yaw: number;
  roll: number;
} => {
  // Robust head pose approximation using 2D landmark geometry.
  // Uses eye centers, nose tip and chin to estimate pitch/yaw/roll in degrees.
  const safe = (i: number) => landmarks[i] || [0, 0, 0];
  const leftEyeIdxs = [33, 7, 163, 144, 145];
  const rightEyeIdxs = [263, 249, 390, 373, 374];

  const avgPoint = (idxs: number[]) => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const i of idxs) {
      const p = safe(i);
      if (p[0] || p[1]) {
        sx += p[0];
        sy += p[1];
        count++;
      }
    }
    if (count === 0) return [0, 0];
    return [sx / count, sy / count];
  };

  const leftEye = avgPoint(leftEyeIdxs);
  const rightEye = avgPoint(rightEyeIdxs);
  const nose = safe(1); // approximate nose tip index
  const chin = safe(152);

  // Roll: angle of the eye-line
  const roll = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]) * (180 / Math.PI);

  // Yaw: relative horizontal position of nose between eyes
  const eyeCenterX = (leftEye[0] + rightEye[0]) / 2;
  const interEyeDist = Math.max(1, Math.hypot(rightEye[0] - leftEye[0], rightEye[1] - leftEye[1]));
  const yaw = ((nose[0] - eyeCenterX) / interEyeDist) * 30; // scaled degrees

  // Pitch: vertical distance of nose from eye line relative to inter-eye distance
  const eyeLineY = (leftEye[1] + rightEye[1]) / 2;
  const pitch = ((nose[1] - eyeLineY) / interEyeDist) * 30; // scaled degrees

  return {
    pitch: pitch || 0,
    yaw: yaw || 0,
    roll: roll || 0,
  };
};

export const calculateEyeAspectRatio = (landmarks: Array<[number, number, number]>): number => {
  // MediaPipe eye landmarks indices
  const leftEyePoints = [362, 385, 387, 263, 373, 380]; // left eye
  const rightEyePoints = [33, 160, 158, 133, 153, 144]; // right eye

  const calculateRatio = (points: number[]) => {
    const eye = points.map(i => landmarks[i]);
    const vertical1 = Math.hypot(eye[1][0] - eye[4][0], eye[1][1] - eye[4][1]);
    const vertical2 = Math.hypot(eye[2][0] - eye[3][0], eye[2][1] - eye[3][1]);
    const horizontal = Math.hypot(eye[0][0] - eye[5][0], eye[0][1] - eye[5][1]);
    return (vertical1 + vertical2) / (2 * horizontal);
  };

  const leftRatio = calculateRatio(leftEyePoints);
  const rightRatio = calculateRatio(rightEyePoints);

  return (leftRatio + rightRatio) / 2;
};

export const calculateMouthOpenness = (landmarks: Array<[number, number, number]>): number => {
  // MediaPipe mouth landmarks
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];

  if (!mouthTop || !mouthBottom) {
    return 0;
  }

  return Math.abs(mouthBottom[1] - mouthTop[1]);
};

export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const getDeviceInfo = () => {
  return {
    os: Platform.OS,
    osVersion: Platform.Version,
    isAndroid: Platform.OS === 'android',
  };
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
};

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};
