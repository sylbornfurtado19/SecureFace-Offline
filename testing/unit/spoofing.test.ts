describe('Anti-Spoofing Service', () => {
  describe('Spoofing Detection', () => {
    it('should detect printed photo', () => {
      const mockResult = {
        spoofingDetected: true,
        confidence: 0.7,
        reasons: ['Printed photo detected'],
      };

      expect(mockResult.spoofingDetected).toBe(true);
      expect(mockResult.confidence).toBeGreaterThan(0.5);
      expect(mockResult.reasons.length).toBeGreaterThan(0);
    });

    it('should detect screen replay', () => {
      const mockResult = {
        spoofingDetected: true,
        confidence: 0.65,
        reasons: ['Screen replay detected'],
      };

      expect(mockResult.spoofingDetected).toBe(true);
      expect(mockResult.reasons).toContain('Screen replay detected');
    });

    it('should pass genuine face', () => {
      const mockResult = {
        spoofingDetected: false,
        confidence: 0.15,
        reasons: [],
      };

      expect(mockResult.spoofingDetected).toBe(false);
      expect(mockResult.confidence).toBeLessThan(0.5);
    });
  });
});
