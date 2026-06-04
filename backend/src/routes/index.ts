import { Router } from 'express';
import {
  AttendanceController,
  EmbeddingController,
  AuditController,
  DeviceController,
} from '../controllers';

const router = Router();

const attendanceController = new AttendanceController();
const embeddingController = new EmbeddingController();
const auditController = new AuditController();
const deviceController = new DeviceController();

// Attendance routes
router.post('/api/attendance', (req, res) => attendanceController.createAttendanceRecord(req, res));
router.get('/api/attendance/:userId', (req, res) => attendanceController.getAttendanceRecords(req, res));

// Embedding routes
router.post('/api/embeddings', (req, res) => embeddingController.uploadEmbedding(req, res));
router.get('/api/embeddings/:userId', (req, res) => embeddingController.getEmbeddings(req, res));

// Audit log routes
router.post('/api/audit-logs', (req, res) => auditController.createAuditLog(req, res));

// Device routes
router.post('/api/devices/register', (req, res) => deviceController.registerDevice(req, res));
router.post('/api/devices/verify', (req, res) => deviceController.verifyDevice(req, res));

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

export default router;
