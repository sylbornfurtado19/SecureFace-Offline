import TFLite from 'react-native-fast-tflite';
import { CameraFrame } from '../types';
import { CONSTANTS } from '../utils/constants';
import { normalizeEmbedding } from '../utils/helpers';
import preprocessing from '../utils/preprocessing';

class TFLiteModelService {
  private modelLoaded: boolean = false;
  private faceDetectionModel: any = null;
  private faceRecognitionModel: any = null;

  async initialize(): Promise<void> {
    try {
      await this.loadModels();
      this.modelLoaded = true;
    } catch (error) {
      throw new Error(`Failed to initialize TFLite models: ${error}`);
    }
  }

  private async loadModels(): Promise<void> {
    try {
      // Load face detection model
      this.faceDetectionModel = await TFLite.loadModel({
        model: require('../../assets/models/face_detection_short_range.tflite'),
      });

      // Load face recognition model (MobileFaceNet)
      this.faceRecognitionModel = await TFLite.loadModel({
        model: require('../../assets/models/mobilefacenet.tflite'),
      });
    } catch (error) {
      throw new Error(`Failed to load TFLite models: ${error}`);
    }
  }

  async detectFaces(frame: CameraFrame): Promise<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>> {
    if (!this.modelLoaded || !this.faceDetectionModel) {
      throw new Error('Model not loaded');
    }

    try {
      const resizedFrame = preprocessing.resizeFrame(frame, 320, 320);
      const input = preprocessing.frameToTensor(resizedFrame);

      const output = await TFLite.runModel({
        model: this.faceDetectionModel,
        input,
      });

      return this.parseFaceDetectionOutput(output, frame.width, frame.height);
    } catch (error) {
      throw new Error(`Face detection failed: ${error}`);
    }
  }

  async generateEmbedding(frame: CameraFrame, faceBound: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<number[]> {
    if (!this.modelLoaded || !this.faceRecognitionModel) {
      throw new Error('Model not loaded');
    }

    try {
      const croppedFrame = preprocessing.cropFrame(frame, faceBound);
      const alignedFrame = preprocessing.alignFace(croppedFrame, 112);
      const resizedFrame = preprocessing.resizeFrame(alignedFrame, 112, 112);
      const input = preprocessing.frameToTensor(resizedFrame);

      const output = await TFLite.runModel({
        model: this.faceRecognitionModel,
        input,
      });

      return this.parseEmbeddingOutput(output);
    } catch (error) {
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  async generateEmbeddingFromFile(file: { path: string; width?: number; height?: number }, faceBound: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<number[]> {
    if (!this.modelLoaded || !this.faceRecognitionModel) {
      throw new Error('Model not loaded');
    }

    try {
      // Attempt to fetch file contents (works for file:// URIs in many RN setups)
      const res = await fetch(file.path);
      const arrayBuffer = await res.arrayBuffer();

      const cameraFrame: CameraFrame = {
        data: arrayBuffer,
        width: file.width || CONSTANTS.CAMERA_RESOLUTION_WIDTH,
        height: file.height || CONSTANTS.CAMERA_RESOLUTION_HEIGHT,
        format: 'native',
      };

      return await this.generateEmbedding(cameraFrame, faceBound);
    } catch (error) {
      throw new Error(`Failed to generate embedding from file: ${error}`);
    }
  }

  private resizeFrame(frame: CameraFrame, width: number, height: number): CameraFrame {
    // Nearest-neighbor resize implementation for RGB/RGBA byte buffers.
    const src = new Uint8Array(frame.data);
    const srcW = frame.width;
    const srcH = frame.height;
    if (!srcW || !srcH || src.length === 0) {
      return { data: frame.data, width, height, format: frame.format };
    }

    const bytesPerPixel = Math.max(1, Math.floor(src.length / (srcW * srcH)));
    const dst = new Uint8Array(width * height * bytesPerPixel);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.min(srcW - 1, Math.floor((x / width) * srcW));
        const srcY = Math.min(srcH - 1, Math.floor((y / height) * srcH));
        const srcIdx = (srcY * srcW + srcX) * bytesPerPixel;
        const dstIdx = (y * width + x) * bytesPerPixel;
        for (let b = 0; b < bytesPerPixel; b++) {
          dst[dstIdx + b] = src[srcIdx + b];
        }
      }
    }

    return {
      data: dst.buffer,
      width,
      height,
      format: frame.format,
    };
  }

  private frameToTensor(frame: CameraFrame): number[] {
    const bytes = new Uint8Array(frame.data);
    const tensor: number[] = [];

    // Determine bytes per pixel (3=RGB,4=RGBA,1=grayscale)
    const bpp = Math.max(1, Math.floor(bytes.length / (frame.width * frame.height)));

    // Convert to float normalized [-1,1] in R,G,B order
    for (let i = 0; i < frame.width * frame.height; i++) {
      const base = i * bpp;
      const r = bytes[base] ?? 0;
      const g = bytes[base + 1] ?? r;
      const b = bytes[base + 2] ?? r;

      tensor.push((r / 127.5) - 1.0);
      tensor.push((g / 127.5) - 1.0);
      tensor.push((b / 127.5) - 1.0);
    }

    return tensor;
  }

  private cropFrame(frame: CameraFrame, bound: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): CameraFrame {
    const src = new Uint8Array(frame.data);
    const startX = Math.max(0, Math.floor(bound.x));
    const startY = Math.max(0, Math.floor(bound.y));
    const endX = Math.min(frame.width, Math.floor(bound.x + bound.width));
    const endY = Math.min(frame.height, Math.floor(bound.y + bound.height));

    const outW = Math.max(1, endX - startX);
    const outH = Math.max(1, endY - startY);
    const bpp = Math.max(1, Math.floor(src.length / (frame.width * frame.height)));

    const out = new Uint8Array(outW * outH * bpp);

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const sx = startX + x;
        const sy = startY + y;
        const sIdx = (sy * frame.width + sx) * bpp;
        const dIdx = (y * outW + x) * bpp;
        for (let k = 0; k < bpp; k++) {
          out[dIdx + k] = src[sIdx + k];
        }
      }
    }

    return {
      data: out.buffer,
      width: outW,
      height: outH,
      format: frame.format,
    };
  }

  private alignFace(frame: CameraFrame): CameraFrame {
    // Simple center-crop to square around the face with a margin to account for rotation.
    const w = frame.width;
    const h = frame.height;
    const size = Math.max(w, h);
    const dstSize = Math.min(112, size);

    // If frame is already small, return as-is
    if (w === dstSize && h === dstSize) {
      return frame;
    }

    // Create a square crop centered on the frame
    const src = new Uint8Array(frame.data);
    const bpp = Math.max(1, Math.floor(src.length / (w * h)));

    const startX = Math.max(0, Math.floor((w - dstSize) / 2));
    const startY = Math.max(0, Math.floor((h - dstSize) / 2));

    const out = new Uint8Array(dstSize * dstSize * bpp);

    for (let y = 0; y < dstSize; y++) {
      for (let x = 0; x < dstSize; x++) {
        const sx = Math.min(w - 1, startX + x);
        const sy = Math.min(h - 1, startY + y);
        const sIdx = (sy * w + sx) * bpp;
        const dIdx = (y * dstSize + x) * bpp;
        for (let k = 0; k < bpp; k++) {
          out[dIdx + k] = src[sIdx + k];
        }
      }
    }

    return {
      data: out.buffer,
      width: dstSize,
      height: dstSize,
      format: frame.format,
    };
  }

  private parseEmbeddingOutput(output: any): number[] {
    let embedding: number[] = [];

    if (Array.isArray(output)) {
      if (Array.isArray(output[0])) {
        embedding = output[0];
      } else {
        embedding = output;
      }
    } else if (output.output) {
      embedding = output.output;
    }

    // Normalize embedding
    embedding = normalizeEmbedding(embedding);

    return embedding;
  }

  private parseFaceDetectionOutput(
    output: any,
    frameWidth: number,
    frameHeight: number
  ): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }> {
    const faces: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }> = [];

    try {
      // Parse detection boxes and scores
      if (output.detections) {
        for (const detection of output.detections) {
          if (detection.confidence > 0.5) {
            const bbox = detection.bbox;
            faces.push({
              x: bbox[0] * frameWidth,
              y: bbox[1] * frameHeight,
              width: (bbox[2] - bbox[0]) * frameWidth,
              height: (bbox[3] - bbox[1]) * frameHeight,
              confidence: detection.confidence,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse face detection output:', error);
    }

    return faces;
  }

  async unloadModels(): Promise<void> {
    try {
      if (this.faceDetectionModel) {
        await TFLite.deleteModel({ model: this.faceDetectionModel });
      }
      if (this.faceRecognitionModel) {
        await TFLite.deleteModel({ model: this.faceRecognitionModel });
      }
      this.modelLoaded = false;
    } catch (error) {
      throw new Error(`Failed to unload models: ${error}`);
    }
  }

  isModelLoaded(): boolean {
    return this.modelLoaded;
  }
}

export default new TFLiteModelService();
