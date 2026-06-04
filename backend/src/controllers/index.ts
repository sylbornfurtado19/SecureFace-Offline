import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import DynamoDBService from '../services/DynamoDBService';
import { AttendanceRecord, EmbeddingData } from '../types';

export class AttendanceController {
  async createAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userName, employeeId, timestamp, confidence } = req.body;

      if (!userId || !employeeId || !timestamp || confidence === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          timestamp: Date.now(),
        });
        return;
      }

      const record: AttendanceRecord = {
        id: uuidv4(),
        userId,
        userName,
        employeeId,
        timestamp,
        confidence,
      };

      await DynamoDBService.putAttendanceRecord(record);

      res.status(201).json({
        success: true,
        data: record,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to create attendance record: ${error}`,
        timestamp: Date.now(),
      });
    }
  }

  async getAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: Date.now(),
        });
        return;
      }

      const records = await DynamoDBService.getAttendanceRecords(userId);

      res.status(200).json({
        success: true,
        data: records,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to get attendance records: ${error}`,
        timestamp: Date.now(),
      });
    }
  }
}

export class EmbeddingController {
  async uploadEmbedding(req: Request, res: Response): Promise<void> {
    try {
      const { userId, embedding, timestamp } = req.body;

      if (!userId || !embedding) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          timestamp: Date.now(),
        });
        return;
      }

      const embeddingData: EmbeddingData = {
        id: uuidv4(),
        userId,
        embedding, // Already encrypted from client
        timestamp: timestamp || Date.now(),
      };

      await DynamoDBService.putEmbedding(embeddingData);

      res.status(201).json({
        success: true,
        data: { id: embeddingData.id },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to upload embedding: ${error}`,
        timestamp: Date.now(),
      });
    }
  }

  async getEmbeddings(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: Date.now(),
        });
        return;
      }

      const embeddings = await DynamoDBService.getEmbeddings(userId);

      res.status(200).json({
        success: true,
        data: { embeddings },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to get embeddings: ${error}`,
        timestamp: Date.now(),
      });
    }
  }
}

export class AuditController {
  async createAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action, details, timestamp } = req.body;

      if (!userId || !action) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          timestamp: Date.now(),
        });
        return;
      }

      const log = {
        id: uuidv4(),
        userId,
        action,
        details,
        timestamp: timestamp || Date.now(),
      };

      await DynamoDBService.putAuditLog(log);

      res.status(201).json({
        success: true,
        data: log,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to create audit log: ${error}`,
        timestamp: Date.now(),
      });
    }
  }
}

export class DeviceController {
  async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, info } = req.body;

      if (!deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required',
          timestamp: Date.now(),
        });
        return;
      }

      await DynamoDBService.registerDevice(deviceId, info);

      res.status(201).json({
        success: true,
        data: { deviceId },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to register device: ${error}`,
        timestamp: Date.now(),
      });
    }
  }

  async verifyDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.body;

      if (!deviceId) {
        res.status(400).json({
          success: false,
          error: 'Device ID is required',
          timestamp: Date.now(),
        });
        return;
      }

      const verified = await DynamoDBService.verifyDevice(deviceId);

      res.status(200).json({
        success: true,
        data: { verified },
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to verify device: ${error}`,
        timestamp: Date.now(),
      });
    }
  }
}
