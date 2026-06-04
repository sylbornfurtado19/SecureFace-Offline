import { cosineSimilarity, euclideanDistance, calculateAverageEmbedding } from '../../src/utils/helpers';

describe('Math Helpers', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    });

    it('should handle orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });
  });

  describe('euclideanDistance', () => {
    it('should calculate euclidean distance correctly', () => {
      const a = [0, 0, 0];
      const b = [1, 1, 1];
      expect(euclideanDistance(a, b)).toBeCloseTo(Math.sqrt(3));
    });
  });

  describe('calculateAverageEmbedding', () => {
    it('should calculate average of embeddings', () => {
      const embeddings = [[1, 2, 3], [4, 5, 6]];
      const avg = calculateAverageEmbedding(embeddings);
      expect(avg).toHaveLength(3);
    });

    it('should normalize the result', () => {
      const embeddings = [[1, 0, 0], [0, 1, 0]];
      const avg = calculateAverageEmbedding(embeddings);
      const norm = Math.sqrt(avg.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 5);
    });
  });
});
