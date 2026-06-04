import { CONSTANTS, LIVENESS_CHALLENGES } from '../utils/constants';
import {
  calculateEyeAspectRatio,
  calculateMouthOpenness,
  calculateHeadPose,
} from '../utils/helpers';
import { LivenessChallenge, LivenessResult, FaceLandmarks } from '../types';

class LivenessDetectionService {
  private currentChallenge: LivenessChallenge | null = null;
  private challengesCompleted: string[] = [];
  private frameHistory: Array<{
    eyeAspectRatio: number;
    mouthOpenness: number;
    headPose: { pitch: number; yaw: number; roll: number };
    timestamp: number;
  }> = [];

  private readonly MAX_FRAME_HISTORY = 30;

  initiateLivenessCheck(): LivenessChallenge {
    const challenges = Object.values(LIVENESS_CHALLENGES);
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

    this.currentChallenge = {
      id: `challenge-${Date.now()}`,
      type: randomChallenge as any,
      completed: false,
      detectionFrames: [],
      startTime: Date.now(),
    };

    return this.currentChallenge;
  }

  processFrame(landmarks: FaceLandmarks): {
    challengeProgress: number;
    detectionConfidence: number;
    completed: boolean;
  } {
    if (!this.currentChallenge || !landmarks) {
      return {
        challengeProgress: 0,
        detectionConfidence: 0,
        completed: false,
      };
    }

    const eyeAspectRatio = calculateEyeAspectRatio(landmarks.landmarks);
    const mouthOpenness = calculateMouthOpenness(landmarks.landmarks);
    const headPose = calculateHeadPose(landmarks.landmarks);

    this.frameHistory.push({
      eyeAspectRatio,
      mouthOpenness,
      headPose,
      timestamp: Date.now(),
    });

    if (this.frameHistory.length > this.MAX_FRAME_HISTORY) {
      this.frameHistory.shift();
    }

    const result = this.detectChallenge(
      eyeAspectRatio,
      mouthOpenness,
      headPose
    );

    if (result.detected) {
      this.currentChallenge.detectionFrames.push(Date.now());

      if (this.currentChallenge.detectionFrames.length >= 5) {
        this.currentChallenge.completed = true;
        this.currentChallenge.endTime = Date.now();
        this.challengesCompleted.push(this.currentChallenge.type);
      }
    }

    return {
      challengeProgress: Math.min(
        this.currentChallenge.detectionFrames.length / 5,
        1
      ),
      detectionConfidence: result.confidence,
      completed: this.currentChallenge.completed,
    };
  }

  private detectChallenge(
    eyeAspectRatio: number,
    mouthOpenness: number,
    headPose: { pitch: number; yaw: number; roll: number }
  ): {
    detected: boolean;
    confidence: number;
  } {
    if (!this.currentChallenge) {
      return { detected: false, confidence: 0 };
    }

    switch (this.currentChallenge.type) {
      case LIVENESS_CHALLENGES.BLINK:
        return this.detectBlink(eyeAspectRatio);

      case LIVENESS_CHALLENGES.SMILE:
        return this.detectSmile(mouthOpenness);

      case LIVENESS_CHALLENGES.HEAD_LEFT:
        return this.detectHeadTurn(headPose, 'left');

      case LIVENESS_CHALLENGES.HEAD_RIGHT:
        return this.detectHeadTurn(headPose, 'right');

      default:
        return { detected: false, confidence: 0 };
    }
  }

  private detectBlink(eyeAspectRatio: number): {
    detected: boolean;
    confidence: number;
  } {
    const recentFrames = this.frameHistory.slice(-15);

    if (recentFrames.length < 5) {
      return { detected: false, confidence: 0 };
    }

    let minRatio = Math.min(...recentFrames.map(f => f.eyeAspectRatio));
    let maxRatio = Math.max(...recentFrames.map(f => f.eyeAspectRatio));

    const blinked = minRatio < CONSTANTS.BLINK_THRESHOLD && maxRatio > 0.2;
    const confidence = blinked ? Math.min(1, (maxRatio - minRatio) / 0.3) : 0;

    return { detected: blinked, confidence };
  }

  private detectSmile(mouthOpenness: number): {
    detected: boolean;
    confidence: number;
  } {
    const recentFrames = this.frameHistory.slice(-15);

    if (recentFrames.length < 5) {
      return { detected: false, confidence: 0 };
    }

    const avgMouthOpenness = recentFrames.reduce((sum, f) => sum + f.mouthOpenness, 0) /
      recentFrames.length;
    const smiled = avgMouthOpenness > CONSTANTS.SMILE_THRESHOLD;
    const confidence = smiled ? Math.min(1, avgMouthOpenness / 50) : 0;

    return { detected: smiled, confidence };
  }

  private detectHeadTurn(
    headPose: { pitch: number; yaw: number; roll: number },
    direction: 'left' | 'right'
  ): {
    detected: boolean;
    confidence: number;
  } {
    const recentFrames = this.frameHistory.slice(-20);

    if (recentFrames.length < 5) {
      return { detected: false, confidence: 0 };
    }

    const yawAngles = recentFrames.map(f => f.headPose.yaw);
    const minYaw = Math.min(...yawAngles);
    const maxYaw = Math.max(...yawAngles);

    let detected = false;
    let confidence = 0;

    if (direction === 'left') {
      detected = minYaw < -CONSTANTS.HEAD_TURN_THRESHOLD;
      confidence = Math.min(1, Math.abs(minYaw) / CONSTANTS.HEAD_TURN_THRESHOLD);
    } else {
      detected = maxYaw > CONSTANTS.HEAD_TURN_THRESHOLD;
      confidence = Math.min(1, maxYaw / CONSTANTS.HEAD_TURN_THRESHOLD);
    }

    return { detected, confidence };
  }

  async completeLivenessCheck(): Promise<LivenessResult> {
    const completedCount = this.challengesCompleted.length;
    const totalChallenges = CONSTANTS.LIVENESS_CHALLENGES_COUNT;
    const passed = completedCount >= totalChallenges;

    const result: LivenessResult = {
      passed,
      confidence: Math.min(1, completedCount / totalChallenges),
      challengesPassed: this.challengesCompleted,
      totalChallenges,
      processingTime: Date.now() - (this.currentChallenge?.startTime || 0),
    };

    this.reset();

    return result;
  }

  reset(): void {
    this.currentChallenge = null;
    this.challengesCompleted = [];
    this.frameHistory = [];
  }

  getCurrentChallenge(): LivenessChallenge | null {
    return this.currentChallenge;
  }

  getCompletedChallenges(): string[] {
    return [...this.challengesCompleted];
  }

  getFrameHistory() {
    return this.frameHistory;
  }
}

export default new LivenessDetectionService();
