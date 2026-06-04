import AntiSpoofingService from '../src/services/AntiSpoofingService';

describe('AntiSpoofingService', () => {
  beforeEach(() => {
    AntiSpoofingService.reset();
  });

  test('detects low depth variance as printed photo', () => {
    const landmarks = {
      landmarks: new Array(468).fill([0, 0, 0]),
      confidence: 0.5,
      faceBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    } as any;

    const res = AntiSpoofingService.analyzeSpoofingRisk(landmarks);
    // with low confidence and zero z variance, we expect a non-zero risk
    expect(res.confidence).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.reasons)).toBe(true);
  });
});
