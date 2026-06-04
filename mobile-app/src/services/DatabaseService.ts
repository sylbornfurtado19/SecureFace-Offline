import SQLite from 'react-native-sqlite-storage';
import { CONSTANTS } from '../utils/constants';
import { User, FaceEmbedding, AttendanceRecord, AuditLog, SyncQueueItem } from '../types';
import EncryptionService from './EncryptionService';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.db = await SQLite.openDatabase({
        name: CONSTANTS.DB_NAME,
        location: 'default',
      });

      await this.createTables();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        employee_id TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        sample_index INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        confidence REAL NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        synced_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        sync_attempts INTEGER NOT NULL DEFAULT 0
      )`,
    ];

    for (const table of tables) {
      await this.db.executeSql(table);
    }
  }

  // User operations
  async createUser(user: User): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(
        `INSERT INTO users (id, name, employee_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, user.name, user.employeeId, user.createdAt, user.updatedAt]
      );

      await this.addAuditLog(user.id, 'USER_CREATED', `User ${user.name} created`);
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        `SELECT id, name, employee_id, created_at, updated_at FROM users WHERE id = ?`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows.item(0);
      return {
        id: row.id,
        name: row.name,
        employeeId: row.employee_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        `SELECT id, name, employee_id, created_at, updated_at FROM users ORDER BY created_at DESC`
      );

      const users: User[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        users.push({
          id: row.id,
          name: row.name,
          employeeId: row.employee_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      return users;
    } catch (error) {
      throw new Error(`Failed to get all users: ${error}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(`DELETE FROM embeddings WHERE user_id = ?`, [userId]);
      await this.db.executeSql(`DELETE FROM attendance WHERE user_id = ?`, [userId]);
      await this.db.executeSql(`DELETE FROM users WHERE id = ?`, [userId]);
      await this.addAuditLog(userId, 'USER_DELETED', 'User deleted');
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  // Embedding operations
  async createEmbedding(embedding: FaceEmbedding): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const encryptedEmbedding = EncryptionService.encryptEmbedding(embedding.embedding);
      await this.db.executeSql(
        `INSERT INTO embeddings (id, user_id, embedding, created_at, sample_index)
         VALUES (?, ?, ?, ?, ?)`,
        [embedding.id, embedding.userId, encryptedEmbedding, embedding.createdAt, embedding.sampleIndex]
      );
    } catch (error) {
      throw new Error(`Failed to create embedding: ${error}`);
    }
  }

  async getEmbeddingsByUserId(userId: string): Promise<FaceEmbedding[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        `SELECT id, user_id, embedding, created_at, sample_index FROM embeddings WHERE user_id = ? ORDER BY sample_index ASC`,
        [userId]
      );

      const embeddings: FaceEmbedding[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        embeddings.push({
          id: row.id,
          userId: row.user_id,
          embedding: EncryptionService.decryptEmbedding(row.embedding),
          createdAt: row.created_at,
          sampleIndex: row.sample_index,
        });
      }

      return embeddings;
    } catch (error) {
      throw new Error(`Failed to get embeddings: ${error}`);
    }
  }

  async deleteEmbeddingsByUserId(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(`DELETE FROM embeddings WHERE user_id = ?`, [userId]);
    } catch (error) {
      throw new Error(`Failed to delete embeddings: ${error}`);
    }
  }

  // Attendance operations
  async createAttendanceRecord(record: AttendanceRecord): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(
        `INSERT INTO attendance (id, user_id, user_name, employee_id, timestamp, confidence, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.userId,
          record.userName,
          record.employeeId,
          record.timestamp,
          record.confidence,
          record.synced ? 1 : 0,
        ]
      );

      await this.addSyncQueueItem({
        id: record.id,
        type: 'attendance',
        data: record,
        createdAt: record.timestamp,
        synced: false,
        syncAttempts: 0,
      });

      await this.addAuditLog(record.userId, 'ATTENDANCE_MARKED', `Attendance marked for ${record.employeeId}`);
    } catch (error) {
      throw new Error(`Failed to create attendance record: ${error}`);
    }
  }

  async getAttendanceRecords(
    userId?: string,
    startDate?: number,
    endDate?: number
  ): Promise<AttendanceRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM attendance WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await this.db.executeSql(query, params);

      const records: AttendanceRecord[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        records.push({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name,
          employeeId: row.employee_id,
          timestamp: row.timestamp,
          confidence: row.confidence,
          synced: row.synced === 1,
          syncedAt: row.synced_at,
        });
      }

      return records;
    } catch (error) {
      throw new Error(`Failed to get attendance records: ${error}`);
    }
  }

  // Audit log operations
  async addAuditLog(userId: string, action: string, details: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.db.executeSql(
        `INSERT INTO audit_logs (id, user_id, action, details, timestamp, synced)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userId, action, details, Date.now(), 0]
      );

      await this.addSyncQueueItem({
        id,
        type: 'audit',
        data: { userId, action, details, timestamp: Date.now() },
        createdAt: Date.now(),
        synced: false,
        syncAttempts: 0,
      });
    } catch (error) {
      throw new Error(`Failed to add audit log: ${error}`);
    }
  }

  async getAuditLogs(userId?: string, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const result = await this.db.executeSql(query, params);

      const logs: AuditLog[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        logs.push({
          id: row.id,
          userId: row.user_id,
          action: row.action,
          details: row.details,
          timestamp: row.timestamp,
          synced: row.synced === 1,
        });
      }

      return logs;
    } catch (error) {
      throw new Error(`Failed to get audit logs: ${error}`);
    }
  }

  // Sync queue operations
  async addSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const encryptedData = EncryptionService.encryptObject(item.data);
      await this.db.executeSql(
        `INSERT INTO sync_queue (id, type, data, created_at, synced, sync_attempts)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.type, encryptedData, item.createdAt, item.synced ? 1 : 0, item.syncAttempts]
      );
    } catch (error) {
      throw new Error(`Failed to add sync queue item: ${error}`);
    }
  }

  async getPendingSyncItems(type?: string): Promise<SyncQueueItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM sync_queue WHERE synced = 0';
      const params: any[] = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY created_at ASC';

      const result = await this.db.executeSql(query, params);

      const items: SyncQueueItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        items.push({
          id: row.id,
          type: row.type,
          data: EncryptionService.decryptObject(row.data),
          createdAt: row.created_at,
          synced: row.synced === 1,
          syncAttempts: row.sync_attempts,
        });
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to get pending sync items: ${error}`);
    }
  }

  async markSyncQueueItemAsSynced(itemId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(
        `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
        [itemId]
      );
    } catch (error) {
      throw new Error(`Failed to mark sync item as synced: ${error}`);
    }
  }

  async deleteSyncedItems(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(`DELETE FROM sync_queue WHERE synced = 1`);
    } catch (error) {
      throw new Error(`Failed to delete synced items: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.initialized = false;
      } catch (error) {
        throw new Error(`Failed to close database: ${error}`);
      }
    }
  }
}

export default new DatabaseService();
