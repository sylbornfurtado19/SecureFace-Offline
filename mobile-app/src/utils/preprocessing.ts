import { CameraFrame } from '../types';

export const resizeFrame = (frame: CameraFrame, width: number, height: number): CameraFrame => {
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
      for (let b = 0; b < bytesPerPixel; b++) dst[dstIdx + b] = src[srcIdx + b];
    }
  }

  return { data: dst.buffer, width, height, format: frame.format };
};

export const cropFrame = (frame: CameraFrame, bound: { x: number; y: number; width: number; height: number }): CameraFrame => {
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
      for (let k = 0; k < bpp; k++) out[dIdx + k] = src[sIdx + k];
    }
  }

  return { data: out.buffer, width: outW, height: outH, format: frame.format };
};

export const alignFace = (frame: CameraFrame, targetSize: number = 112): CameraFrame => {
  const w = frame.width;
  const h = frame.height;
  const src = new Uint8Array(frame.data);
  const bpp = Math.max(1, Math.floor(src.length / (w * h)));

  const dstSize = Math.min(targetSize, Math.max(1, Math.max(w, h)));
  const startX = Math.max(0, Math.floor((w - dstSize) / 2));
  const startY = Math.max(0, Math.floor((h - dstSize) / 2));

  const out = new Uint8Array(dstSize * dstSize * bpp);

  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      const sx = Math.min(w - 1, startX + x);
      const sy = Math.min(h - 1, startY + y);
      const sIdx = (sy * w + sx) * bpp;
      const dIdx = (y * dstSize + x) * bpp;
      for (let k = 0; k < bpp; k++) out[dIdx + k] = src[sIdx + k];
    }
  }

  return { data: out.buffer, width: dstSize, height: dstSize, format: frame.format };
};

export const frameToTensor = (frame: CameraFrame): number[] => {
  const bytes = new Uint8Array(frame.data);
  const tensor: number[] = [];
  const bpp = Math.max(1, Math.floor(bytes.length / (frame.width * frame.height)));
  for (let i = 0; i < frame.width * frame.height; i++) {
    const base = i * bpp;
    const r = bytes[base] ?? 0;
    const g = bytes[base + 1] ?? r;
    const b = bytes[base + 2] ?? r;
    tensor.push((r / 127.5) - 1.0, (g / 127.5) - 1.0, (b / 127.5) - 1.0);
  }
  return tensor;
};

export default {
  resizeFrame,
  cropFrame,
  alignFace,
  frameToTensor,
};
