import { CONSTANTS } from '../utils/constants';
import { cosineSimilarity, calculateAverageEmbedding } from '../utils/helpers';
import TFLiteModelService from './TFLiteModelService';
import DatabaseService from './DatabaseService';
import { RecognitionResult, CameraFrame } from '../types';

class FaceRecognitionService {
  private recognitionCache: Map<string, {
    embedding: number[];
    timestamp: number;
  }> = new Map();

  private readonly CACHE_EXPIRY_MS = 60000; // 1 minute

  async recognizeFace(frame: CameraFrame, faceBound: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<RecognitionResult> {
    const startTime = Date.now();

    try {
      // Generate embedding for current face
      const currentEmbedding = await TFLiteModelService.generateEmbedding(frame, faceBound);

      if (!currentEmbedding || currentEmbedding.length === 0) {
        return {
          recognized: false,
          userId: '',
          confidence: 0,
          embeddingDistance: Number.MAX_VALUE,
          processingTime: Date.now() - startTime,
        };
      }

      // Get all users from database
      const users = await DatabaseService.getAllUsers();

      let bestMatch: {
        userId: string;
        confidence: number;
        distance: number;
      } | null = null;

      // Compare with all registered embeddings
      for (const user of users) {
        const embeddings = await DatabaseService.getEmbeddingsByUserId(user.id);

        if (embeddings.length === 0) {
          continue;
        }

        // Average the user's embeddings
        const userEmbeddings = embeddings.map(e => e.embedding);
        const averageEmbedding = calculateAverageEmbedding(userEmbeddings);

        // Calculate similarity
        const similarity = cosineSimilarity(currentEmbedding, averageEmbedding);
        const confidence = Math.max(0, Math.min(1, (similarity + 1) / 2));

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            userId: user.id,
            confidence,
            distance: 1 - similarity,
          };
        }
      }

      if (bestMatch && bestMatch.confidence >= CONSTANTS.RECOGNITION_CONFIDENCE_THRESHOLD) {
        return {
          recognized: true,
          userId: bestMatch.userId,
          confidence: bestMatch.confidence,
          embeddingDistance: bestMatch.distance,
          processingTime: Date.now() - startTime,
        };
      }

      return {
        recognized: false,
        userId: '',
        confidence: bestMatch?.confidence || 0,
        embeddingDistance: bestMatch?.distance || Number.MAX_VALUE,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Face recognition failed: ${error}`);
    }
  }

  async recognizeEmbedding(currentEmbedding: number[]): Promise<RecognitionResult> {
    const startTime = Date.now();

    try {
      if (!currentEmbedding || currentEmbedding.length === 0) {
        return {
          recognized: false,
          userId: '',
          confidence: 0,
          embeddingDistance: Number.MAX_VALUE,
          processingTime: Date.now() - startTime,
        };
      }

      const users = await DatabaseService.getAllUsers();

      let bestMatch: {
        userId: string;
        confidence: number;
        distance: number;
      } | null = null;

      for (const user of users) {
        const embeddings = await DatabaseService.getEmbeddingsByUserId(user.id);

        if (embeddings.length === 0) continue;

        const userEmbeddings = embeddings.map(e => e.embedding);
        const averageEmbedding = calculateAverageEmbedding(userEmbeddings);

        const similarity = cosineSimilarity(currentEmbedding, averageEmbedding);
        const confidence = Math.max(0, Math.min(1, (similarity + 1) / 2));

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            userId: user.id,
            confidence,
            distance: 1 - similarity,
          };
        }
      }

      if (bestMatch && bestMatch.confidence >= CONSTANTS.RECOGNITION_CONFIDENCE_THRESHOLD) {
        return {
          recognized: true,
          userId: bestMatch.userId,
          confidence: bestMatch.confidence,
          embeddingDistance: bestMatch.distance,
          processingTime: Date.now() - startTime,
        };
      }

      return {
        recognized: false,
        userId: '',
        confidence: bestMatch?.confidence || 0,
        embeddingDistance: bestMatch?.distance || Number.MAX_VALUE,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Embedding recognition failed: ${error}`);
    }
  }

  async verifyFace(frame: CameraFrame, faceBound: {
    x: number;
    y: number;
    width: number;
    height: number;
  }, expectedUserId: string): Promise<{
    verified: boolean;
    confidence: number;
    distance: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Generate embedding for current face
      const currentEmbedding = await TFLiteModelService.generateEmbedding(frame, faceBound);

      if (!currentEmbedding || currentEmbedding.length === 0) {
        return {
          verified: false,
          confidence: 0,
          distance: Number.MAX_VALUE,
          processingTime: Date.now() - startTime,
        };
      }

      // Get user's embeddings
      const embeddings = await DatabaseService.getEmbeddingsByUserId(expectedUserId);

      if (embeddings.length === 0) {
        return {
          verified: false,
          confidence: 0,
          distance: Number.MAX_VALUE,
          processingTime: Date.now() - startTime,
        };
      }

      // Average the user's embeddings
      const userEmbeddings = embeddings.map(e => e.embedding);
      const averageEmbedding = calculateAverageEmbedding(userEmbeddings);

      // Calculate similarity
      const similarity = cosineSimilarity(currentEmbedding, averageEmbedding);
      const confidence = Math.max(0, Math.min(1, (similarity + 1) / 2));
      const distance = 1 - similarity;

      return {
        verified: confidence >= CONSTANTS.RECOGNITION_CONFIDENCE_THRESHOLD,
        confidence,
        distance,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Face verification failed: ${error}`);
    }
  }

  clearCache(): void {
    this.recognitionCache.clear();
  }

  private cleanExpiredCacheEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.recognitionCache.entries()) {
      if (now - value.timestamp > this.CACHE_EXPIRY_MS) {
        this.recognitionCache.delete(key);
      }
    }
  }

  getStatistics(): {
    cachedUsers: number;
    memoryUsage: number;
  } {
    this.cleanExpiredCacheEntries();
    const cachedUsers = this.recognitionCache.size;
    const memoryUsage = cachedUsers * CONSTANTS.EMBEDDING_DIMENSION * 8; // 8 bytes per float64

    return {
      cachedUsers,
      memoryUsage,
    };
  }
}

export default new FaceRecognitionService();
