import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Set the JWT_SECRET environment variable before starting the backend (do not commit secrets to source control).');
}

export const generateToken = (deviceId: string): string => {
  return jwt.sign({ deviceId }, JWT_SECRET, { expiresIn: '30d' });
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No authorization token',
        timestamp: Date.now(),
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).deviceId = decoded.deviceId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: Date.now(),
    });
  }
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: Date.now(),
  });
};
