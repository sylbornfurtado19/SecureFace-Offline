import { CONSTANTS } from '../utils/constants';
import { FaceLandmarks } from '../types';

class AntiSpoofingService {
  private motionHistory: Array<{
    landmarks: Array<[number, number, number]>;
    timestamp: number;
  }> = [];

  private readonly MAX_MOTION_HISTORY = 60;

  analyzeSpoofingRisk(landmarks: FaceLandmarks): {
    spoofingDetected: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for printed photo detection
    const photoRisk = this.detectPrintedPhoto(landmarks);
    if (photoRisk.detected) {
      reasons.push('Printed photo detected');
      riskScore += photoRisk.confidence;
    }

    // Check for screen replay
    const screenRisk = this.detectScreenReplay(landmarks);
    if (screenRisk.detected) {
      reasons.push('Screen replay detected');
      riskScore += screenRisk.confidence;
    }

    // Check for motion consistency
    const motionRisk = this.analyzeMotionConsistency(landmarks);
    if (motionRisk.detected) {
      reasons.push('Suspicious motion pattern');
      riskScore += motionRisk.confidence;
    }

    // Check for face depth approximation
    const depthRisk = this.approximateFaceDepth(landmarks);
    if (depthRisk.detected) {
      reasons.push('Flat face depth detected');
      riskScore += depthRisk.confidence;
    }

    // Normalize risk score
    const finalConfidence = Math.min(riskScore / 4, 1);
    const spoofingDetected = finalConfidence > CONSTANTS.SPOOFING_CONFIDENCE_THRESHOLD;

    return {
      spoofingDetected,
      confidence: finalConfidence,
      reasons,
    };
  }

  private detectPrintedPhoto(landmarks: FaceLandmarks): {
    detected: boolean;
    confidence: number;
  } {
    // Analyze texture and edge characteristics
    // Printed photos typically have:
    // 1. Lower variance in color channels
    // 2. Less detailed eye regions
    // 3. Uniform texture patterns

    try {
      // Check landmark confidence - printed photos often have lower detection confidence
      const avgConfidence = landmarks.confidence;

      if (avgConfidence < 0.7) {
        return {
          detected: true,
          confidence: 0.6,
        };
      }

      // Check for flat appearance (Z-coordinate variance)
      const landmarks3D = landmarks.landmarks;
      const zValues = landmarks3D.map(l => l[2]);
      const zVariance = this.calculateVariance(zValues);

      if (zVariance < 0.02) {
        return {
          detected: true,
          confidence: 0.5,
        };
      }

      return { detected: false, confidence: 0 };
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  private detectScreenReplay(landmarks: FaceLandmarks): {
    detected: boolean;
    confidence: number;
  } {
    // Screen replay detection characteristics:
    // 1. Perfect symmetry in repeated frames
    // 2. Identical lighting on both sides of face
    // 3. Absence of subtle head movements
    // 4. Uniform texture patterns

    try {
      // Add current landmarks to history
      this.motionHistory.push({
        landmarks: landmarks.landmarks,
        timestamp: Date.now(),
      });

      if (this.motionHistory.length > this.MAX_MOTION_HISTORY) {
        this.motionHistory.shift();
      }

      if (this.motionHistory.length < 10) {
        return { detected: false, confidence: 0 };
      }

      // Check for repetitive patterns
      const recentFrames = this.motionHistory.slice(-30);
      const distances = [];

      for (let i = 1; i < recentFrames.length; i++) {
        const distance = this.calculateLandmarkDistance(
          recentFrames[i].landmarks,
          recentFrames[i - 1].landmarks
        );
        distances.push(distance);
      }

      const distVariance = this.calculateVariance(distances);

      if (distVariance < 0.01) {
        return {
          detected: true,
          confidence: 0.7,
        };
      }

      return { detected: false, confidence: 0 };
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  private analyzeMotionConsistency(landmarks: FaceLandmarks): {
    detected: boolean;
    confidence: number;
  } {
    try {
      this.motionHistory.push({
        landmarks: landmarks.landmarks,
        timestamp: Date.now(),
      });

      if (this.motionHistory.length > this.MAX_MOTION_HISTORY) {
        this.motionHistory.shift();
      }

      if (this.motionHistory.length < 20) {
        return { detected: false, confidence: 0 };
      }

      // Analyze motion smoothness
      const recentFrames = this.motionHistory.slice(-20);
      const motionVectors = [];

      for (let i = 1; i < recentFrames.length; i++) {
        const vector = this.calculateMotionVector(
          recentFrames[i - 1].landmarks,
          recentFrames[i].landmarks
        );
        motionVectors.push(vector);
      }

      // Check acceleration consistency
      const accelerations = [];
      for (let i = 1; i < motionVectors.length; i++) {
        const accel = {
          x: motionVectors[i].x - motionVectors[i - 1].x,
          y: motionVectors[i].y - motionVectors[i - 1].y,
        };
        accelerations.push(Math.sqrt(accel.x * accel.x + accel.y * accel.y));
      }

      const accelVariance = this.calculateVariance(accelerations);

      // Natural motion should have smooth acceleration
      if (accelVariance > 5) {
        return { detected: false, confidence: 0 };
      }

      // Too uniform suggests spoofing
      if (accelVariance < 0.1) {
        return {
          detected: true,
          confidence: 0.5,
        };
      }

      return { detected: false, confidence: 0 };
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  private approximateFaceDepth(landmarks: FaceLandmarks): {
    detected: boolean;
    confidence: number;
  } {
    try {
      const landmarks3D = landmarks.landmarks;

      // Extract key facial points
      const nose = landmarks3D[0];
      const leftCheek = landmarks3D[234];
      const rightCheek = landmarks3D[454];
      const chin = landmarks3D[152];
      const forehead = landmarks3D[10];

      // Calculate depth variance
      const depthPoints = [nose, leftCheek, rightCheek, chin, forehead].map(p => p[2]);
      const depthVariance = this.calculateVariance(depthPoints);

      // A flat surface (2D photo) should have low depth variance
      if (depthVariance < CONSTANTS.DEPTH_VARIANCE_THRESHOLD) {
        return {
          detected: true,
          confidence: 0.6,
        };
      }

      return { detected: false, confidence: 0 };
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return variance;
  }

  private calculateLandmarkDistance(
    landmarks1: Array<[number, number, number]>,
    landmarks2: Array<[number, number, number]>
  ): number {
    let totalDistance = 0;

    for (let i = 0; i < Math.min(landmarks1.length, landmarks2.length); i++) {
      const dx = landmarks1[i][0] - landmarks2[i][0];
      const dy = landmarks1[i][1] - landmarks2[i][1];
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    return totalDistance / Math.min(landmarks1.length, landmarks2.length);
  }

  private calculateMotionVector(
    prevLandmarks: Array<[number, number, number]>,
    currLandmarks: Array<[number, number, number]>
  ): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < Math.min(prevLandmarks.length, currLandmarks.length); i++) {
      sumX += currLandmarks[i][0] - prevLandmarks[i][0];
      sumY += currLandmarks[i][1] - prevLandmarks[i][1];
    }

    const count = Math.min(prevLandmarks.length, currLandmarks.length);

    return {
      x: sumX / count,
      y: sumY / count,
    };
  }

  reset(): void {
    this.motionHistory = [];
  }
}

export default new AntiSpoofingService();
