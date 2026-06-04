export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  timestamp: number;
  confidence: number;
}

export interface EmbeddingData {
  id: string;
  userId: string;
  embedding: string; // Encrypted
  timestamp: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface DeviceRegistration {
  deviceId: string;
  info: {
    os: string;
    osVersion: string;
  };
  registeredAt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
