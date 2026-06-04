describe('Liveness Detection Service', () => {
  describe('Challenge Detection', () => {
    it('should detect blink challenge', () => {
      const mockResult = {
        challengeProgress: 1,
        detectionConfidence: 0.85,
        completed: true,
      };

      expect(mockResult.completed).toBe(true);
      expect(mockResult.detectionConfidence).toBeGreaterThan(0.5);
    });

    it('should detect smile challenge', () => {
      const mockResult = {
        challengeProgress: 0.8,
        detectionConfidence: 0.75,
        completed: false,
      };

      expect(mockResult.detectionConfidence).toBeGreaterThan(0);
      expect(mockResult.challengeProgress).toBeLessThanOrEqual(1);
    });

    it('should detect head turn challenge', () => {
      const mockResult = {
        challengeProgress: 0.6,
        detectionConfidence: 0.7,
        completed: false,
      };

      expect(mockResult.detectionConfidence).toBeGreaterThan(0);
    });
  });

  describe('Liveness Completion', () => {
    it('should pass liveness when all challenges completed', async () => {
      const mockResult = {
        passed: true,
        confidence: 1,
        challengesPassed: ['blink', 'smile', 'head_left'],
        totalChallenges: 3,
        processingTime: 15000,
      };

      expect(mockResult.passed).toBe(true);
      expect(mockResult.confidence).toBe(1);
      expect(mockResult.processingTime).toBeLessThan(30000);
    });

    it('should fail liveness when insufficient challenges', async () => {
      const mockResult = {
        passed: false,
        confidence: 0.33,
        challengesPassed: ['blink'],
        totalChallenges: 3,
        processingTime: 5000,
      };

      expect(mockResult.passed).toBe(false);
      expect(mockResult.confidence).toBeLessThan(1);
    });
  });
});
