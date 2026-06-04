import axios, { AxiosInstance } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { CONSTANTS, STORAGE_KEYS } from '../utils/constants';
import DatabaseService from './DatabaseService';
import EncryptionService from './EncryptionService';
import { retryOperation, sleep } from '../utils/helpers';
import { MMKV } from 'react-native-mmkv';

class AWSSyncService {
  private axiosInstance: AxiosInstance;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private mmkv: MMKV;

  constructor() {
    this.mmkv = new MMKV({
      id: CONSTANTS.MMKV_ID,
    });

    this.axiosInstance = axios.create({
      timeout: CONSTANTS.AWS_API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initialize(apiEndpoint: string, apiKey: string): Promise<void> {
    try {
      this.axiosInstance.defaults.baseURL = apiEndpoint;
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;

      this.mmkv.set(STORAGE_KEYS.AWS_CONFIG, JSON.stringify({
        endpoint: apiEndpoint,
        initialized: true,
      }));

      this.startAutoSync();
    } catch (error) {
      throw new Error(`Failed to initialize AWS sync: ${error}`);
    }
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.sync().catch(error => console.warn('Auto sync failed:', error));
    }, CONSTANTS.AUTO_SYNC_INTERVAL_MS);
  }

  async sync(): Promise<{
    synced: boolean;
    itemsUploaded: number;
    errors: string[];
  }> {
    if (this.isSyncing) {
      return {
        synced: false,
        itemsUploaded: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let itemsUploaded = 0;

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return {
          synced: false,
          itemsUploaded: 0,
          errors: ['No network connectivity'],
        };
      }

      // Get pending sync items
      const pendingItems = await DatabaseService.getPendingSyncItems();

      if (pendingItems.length === 0) {
        this.lastSyncTime = Date.now();
        this.mmkv.set(STORAGE_KEYS.LAST_SYNC_TIME, this.lastSyncTime.toString());
        return {
          synced: true,
          itemsUploaded: 0,
          errors: [],
        };
      }

      // Upload attendance records
      const attendanceItems = pendingItems.filter(item => item.type === 'attendance');
      for (const item of attendanceItems) {
        try {
          await retryOperation(
            () => this.uploadAttendanceRecord(item.data),
            CONSTANTS.SYNC_RETRY_ATTEMPTS,
            CONSTANTS.SYNC_RETRY_DELAY_MS
          );
          await DatabaseService.markSyncQueueItemAsSynced(item.id);
          itemsUploaded++;
        } catch (error) {
          errors.push(`Failed to sync attendance ${item.id}: ${error}`);
        }
      }

      // Upload embeddings
      const embeddingItems = pendingItems.filter(item => item.type === 'embedding');
      for (const item of embeddingItems) {
        try {
          await retryOperation(
            () => this.uploadEmbedding(item.data),
            CONSTANTS.SYNC_RETRY_ATTEMPTS,
            CONSTANTS.SYNC_RETRY_DELAY_MS
          );
          await DatabaseService.markSyncQueueItemAsSynced(item.id);
          itemsUploaded++;
        } catch (error) {
          errors.push(`Failed to sync embedding ${item.id}: ${error}`);
        }
      }

      // Upload audit logs
      const auditItems = pendingItems.filter(item => item.type === 'audit');
      for (const item of auditItems) {
        try {
          await retryOperation(
            () => this.uploadAuditLog(item.data),
            CONSTANTS.SYNC_RETRY_ATTEMPTS,
            CONSTANTS.SYNC_RETRY_DELAY_MS
          );
          await DatabaseService.markSyncQueueItemAsSynced(item.id);
          itemsUploaded++;
        } catch (error) {
          errors.push(`Failed to sync audit log ${item.id}: ${error}`);
        }
      }

      // Clean synced items
      await DatabaseService.deleteSyncedItems();

      this.lastSyncTime = Date.now();
      this.mmkv.set(STORAGE_KEYS.LAST_SYNC_TIME, this.lastSyncTime.toString());

      return {
        synced: true,
        itemsUploaded,
        errors,
      };
    } catch (error) {
      errors.push(`Sync failed: ${error}`);
      return {
        synced: false,
        itemsUploaded,
        errors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadAttendanceRecord(record: any): Promise<void> {
    try {
      await this.axiosInstance.post('/api/attendance', {
        id: record.id,
        userId: record.userId,
        employeeId: record.employeeId,
        userName: record.userName,
        timestamp: record.timestamp,
        confidence: record.confidence,
      });
    } catch (error) {
      throw new Error(`Failed to upload attendance record: ${error}`);
    }
  }

  private async uploadEmbedding(data: any): Promise<void> {
    try {
      const encryptedEmbedding = EncryptionService.encryptEmbedding(data.embedding);

      await this.axiosInstance.post('/api/embeddings', {
        id: data.id,
        userId: data.userId,
        embedding: encryptedEmbedding,
        timestamp: data.createdAt,
      });
    } catch (error) {
      throw new Error(`Failed to upload embedding: ${error}`);
    }
  }

  private async uploadAuditLog(data: any): Promise<void> {
    try {
      await this.axiosInstance.post('/api/audit-logs', {
        userId: data.userId,
        action: data.action,
        details: data.details,
        timestamp: data.timestamp,
      });
    } catch (error) {
      throw new Error(`Failed to upload audit log: ${error}`);
    }
  }

  async downloadUserEmbeddings(userId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/api/embeddings/${userId}`);
      return response.data.embeddings || [];
    } catch (error) {
      throw new Error(`Failed to download embeddings: ${error}`);
    }
  }

  async verifyDeviceRegistration(deviceId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/api/devices/verify', {
        deviceId,
      });
      return response.data.verified === true;
    } catch (error) {
      return false;
    }
  }

  async registerDevice(deviceId: string, deviceInfo: any): Promise<void> {
    try {
      await this.axiosInstance.post('/api/devices/register', {
        deviceId,
        info: deviceInfo,
        timestamp: Date.now(),
      });
    } catch (error) {
      throw new Error(`Failed to register device: ${error}`);
    }
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    lastSyncTime?: number;
    pendingItems: number;
  }> {
    const pendingItems = await DatabaseService.getPendingSyncItems();

    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime || undefined,
      pendingItems: pendingItems.length,
    };
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}

export default new AWSSyncService();
